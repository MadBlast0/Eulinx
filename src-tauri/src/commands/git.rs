// Thin native git bridge. These commands shell out to the `git` CLI in the
// project's repo directory; all parsing and business logic lives in TypeScript.

use std::process::Command;

use crate::ipc::{GitChange, GitCommit, GitStatus};

/// Run `git` in `repo`, returning captured stdout or a descriptive error.
fn git(repo: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo)
        .output()
        .map_err(|e| format!("git launch failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("git output not utf8: {e}"))
}

/// Parse the `## branch...origin/branch [ahead N behind M]` porcelain header.
fn parse_branch_line(line: &str) -> (String, u32, u32) {
    let rest = line.strip_prefix("## ").unwrap_or(line);
    let branch = match rest.split("...").next() {
        Some(b) => b.trim().to_string(),
        None => rest.trim().to_string(),
    };

    let mut ahead: u32 = 0;
    let mut behind: u32 = 0;
    if let Some(meta) = rest.find('[').and_then(|i| rest.get(i..)) {
        for token in meta.split(|c: char| c == ' ' || c == ',' || c == ']') {
            if let Some(n) = token.strip_prefix("ahead") {
                ahead = n.trim().parse().unwrap_or(0)
            } else if let Some(n) = token.strip_prefix("behind") {
                behind = n.trim().parse().unwrap_or(0)
            }
        }
    }

    (branch, ahead, behind)
}

/// Build a path -> (add, del) map from `git diff --numstat` output.
fn parse_numstat(out: &str) -> std::collections::HashMap<String, (i64, i64)> {
    let mut map = std::collections::HashMap::new();
    for line in out.lines() {
        let mut parts = line.split('\t');
        let add_s = match parts.next() {
            Some(s) => s,
            None => continue,
        };
        let del_s = match parts.next() {
            Some(s) => s,
            None => continue,
        };
        let path = match parts.next() {
            Some(s) => s,
            None => continue,
        };
        let add = add_s.parse::<i64>().unwrap_or(0);
        let del = del_s.parse::<i64>().unwrap_or(0);
        map.insert(path.to_string(), (add, del));
    }
    map
}

/// Snapshot branch state, working-tree changes, untracked files, and history.
#[tauri::command]
pub fn git_status(repo: String) -> Result<GitStatus, String> {
    let porcelain = git(&repo, &["status", "--porcelain", "-b"])?;

    let mut branch = String::new();
    let mut ahead: u32 = 0;
    let mut behind: u32 = 0;
    let mut changes: Vec<GitChange> = Vec::new();
    let mut untracked: Vec<GitChange> = Vec::new();

    for line in porcelain.lines() {
        if line.starts_with("## ") {
            let parsed = parse_branch_line(line);
            branch = parsed.0;
            ahead = parsed.1;
            behind = parsed.2;
            continue;
        }
        if line.len() < 4 {
            continue;
        }
        let status = line[0..2].to_string();
        let path = line[3..].to_string();
        if status.starts_with('?') {
            untracked.push(GitChange {
                path,
                status,
                add: 0,
                del: 0,
            });
        } else {
            changes.push(GitChange {
                path,
                status,
                add: 0,
                del: 0,
            });
        }
    }

    let numstat = git(&repo, &["diff", "--numstat"]).unwrap_or_default();
    let num = parse_numstat(&numstat);
    for entry in changes.iter_mut() {
        if let Some((add, del)) = num.get(&entry.path) {
            entry.add = *add;
            entry.del = *del;
        }
    }

    let untracked_raw =
        git(&repo, &["ls-files", "--others", "--exclude-standard"]).unwrap_or_default();
    for path in untracked_raw.lines() {
        if path.is_empty() {
            continue;
        }
        untracked.push(GitChange {
            path: path.to_string(),
            status: "U".to_string(),
            add: 0,
            del: 0,
        });
    }

    let log = git(&repo, &["log", "-n", "20", "--pretty=format:%h|%s|%an|%ar"]).unwrap_or_default();
    let commits: Vec<GitCommit> = log
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(4, '|');
            let hash = parts.next()?.to_string();
            let message = parts.next()?.to_string();
            let author = parts.next()?.to_string();
            let when = parts.next()?.to_string();
            Some(GitCommit {
                hash,
                message,
                author,
                when,
            })
        })
        .collect();

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        changes,
        untracked,
        commits,
    })
}

/// Stage all changes (`git add -A`).
#[tauri::command]
pub fn git_stage_all(repo: String) -> Result<(), String> {
    git(&repo, &["add", "-A"]).map(|_| ())
}

/// Create a commit with `message`. Errors if there is nothing staged.
#[tauri::command]
pub fn git_commit(repo: String, message: String) -> Result<String, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("commit message is empty".to_string());
    }
    let out = git(&repo, &["commit", "-m", trimmed])?;
    Ok(out.trim().to_string())
}

/// Push the current branch to its upstream (`git push`).
#[tauri::command]
pub fn git_push(repo: String) -> Result<String, String> {
    let out = git(&repo, &["push"])?;
    Ok(out.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_branch_line_plain() {
        let (branch, ahead, behind) = parse_branch_line("## main");
        assert_eq!(branch, "main");
        assert_eq!(ahead, 0);
        assert_eq!(behind, 0);
    }

    #[test]
    fn parse_branch_line_with_upstream_extracts_branch() {
        let (branch, _ahead, _behind) =
            parse_branch_line("## feature/x...origin/feature/x [ahead 2, behind 3]");
        // The branch name is taken from the part before "...".
        assert_eq!(branch, "feature/x");
    }

    #[test]
    fn parse_branch_line_strips_upstream_suffix() {
        let (branch, _ahead, _behind) = parse_branch_line("## dev...origin/dev [ahead 5]");
        assert_eq!(branch, "dev");
    }

    #[test]
    fn parse_numstat_builds_map() {
        let out = "3\t1\tsrc/a.rs\n0\t0\tsrc/b.rs\n-\t-\tbinary.png\n";
        let map = parse_numstat(out);
        assert_eq!(map.get("src/a.rs"), Some(&(3, 1)));
        assert_eq!(map.get("src/b.rs"), Some(&(0, 0)));
        // Binary files report `-` which parses to 0.
        assert_eq!(map.get("binary.png"), Some(&(0, 0)));
    }

    #[test]
    fn commit_rejects_empty_message() {
        // Uses a path that need not be a repo: validation happens before shelling out.
        let err = git_commit(".".to_string(), "   ".to_string()).unwrap_err();
        assert!(err.contains("empty"));
    }

    /// End-to-end against a real `git` CLI in a throwaway repo. Skipped if git
    /// is not installed so the suite stays green in minimal environments.
    #[test]
    fn git_status_reads_real_repo() {
        if Command::new("git").arg("--version").output().is_err() {
            eprintln!("git not available; skipping git_status_reads_real_repo");
            return;
        }

        let mut dir = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        dir.push(format!("eulinx_git_test_{nanos}"));
        std::fs::create_dir_all(&dir).unwrap();
        let repo = dir.to_string_lossy().to_string();

        let run = |args: &[&str]| {
            Command::new("git")
                .args(args)
                .current_dir(&repo)
                .output()
                .unwrap()
        };
        run(&["init"]);
        run(&["config", "user.email", "test@example.com"]);
        run(&["config", "user.name", "Test"]);

        std::fs::write(dir.join("new.txt"), b"hi").unwrap();

        let status = git_status(repo.clone()).expect("status");
        // A freshly created file with no commits shows up as untracked.
        assert!(
            status.untracked.iter().any(|c| c.path.contains("new.txt")),
            "expected new.txt in untracked, got: {:?}",
            status.untracked
        );

        std::fs::remove_dir_all(&dir).ok();
    }
}
