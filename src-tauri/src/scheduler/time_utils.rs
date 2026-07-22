use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub fn now_iso() -> String {
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO);
    millis_to_rfc3339(d.as_millis() as i64)
}

pub fn rfc3339_to_millis(s: &str) -> Option<i64> {
    if s.len() < 20 {
        return None;
    }
    let chars = s.as_bytes();
    let y = parse_4(chars.get(0..4)?)?;
    if chars.get(4)? != &b'-' {
        return None;
    }
    let m = parse_2(chars.get(5..7)?)?;
    if chars.get(7)? != &b'-' {
        return None;
    }
    let d = parse_2(chars.get(8..10)?)?;
    if chars.get(10)? != &b'T' {
        return None;
    }
    let hh = parse_2(chars.get(11..13)?)?;
    if chars.get(13)? != &b':' {
        return None;
    }
    let mm = parse_2(chars.get(14..16)?)?;
    if chars.get(16)? != &b':' {
        return None;
    }
    let ss = parse_2(chars.get(17..19)?)?;

    let mut ms = 0i64;
    let mut idx = 19;
    if chars.get(idx) == Some(&b'.') {
        let start = idx + 1;
        let end = chars.len() - 1;
        let frac_len = end.saturating_sub(start).min(3);
        if frac_len > 0 {
            let frac = parse_frac(&chars[start..start + frac_len]);
            ms = frac * 10i64.pow((3 - frac_len) as u32);
        }
        idx = end;
    }

    if chars.get(idx) == Some(&b'Z') || chars.get(idx) == Some(&b'+') || chars.get(idx) == Some(&b'-')
    {
        // Accept Z, +00:00, -00:00 — treat as UTC
    }

    let total_days = days_from_civil(y, m, d)?;
    let secs = total_days as i64 * 86400 + hh as i64 * 3600 + mm as i64 * 60 + ss as i64;
    Some(secs * 1000 + ms)
}

pub fn millis_to_rfc3339(ms: i64) -> String {
    if ms < 0 {
        return String::new();
    }
    let total_secs = ms / 1000;
    let ms_part = (ms % 1000).unsigned_abs();
    let days = total_secs / 86400;
    let (year, month, day) = civil_from_days(days as i64);
    let secs_of_day = (total_secs % 86400) as u32;
    let hour = secs_of_day / 3600;
    let minute = (secs_of_day % 3600) / 60;
    let second = secs_of_day % 60;
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hour, minute, second, ms_part
    )
}

fn parse_4(d: &[u8]) -> Option<i64> {
    if d.len() < 4 {
        return None;
    }
    let n = (d[0] - b'0') as i64 * 1000
        + (d[1] - b'0') as i64 * 100
        + (d[2] - b'0') as i64 * 10
        + (d[3] - b'0') as i64;
    Some(n)
}

fn parse_2(d: &[u8]) -> Option<i64> {
    if d.len() < 2 {
        return None;
    }
    let n = (d[0] - b'0') as i64 * 10 + (d[1] - b'0') as i64;
    Some(n)
}

fn parse_frac(d: &[u8]) -> i64 {
    let mut n = 0i64;
    for &b in d {
        n = n * 10 + (b - b'0') as i64;
    }
    n
}

fn days_from_civil(y: i64, m: i64, d: i64) -> Option<i64> {
    if m < 1 || m > 12 || d < 1 || d > 31 {
        return None;
    }
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146097 + doe - 719468)
}

fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 {
        (mp + 3) as u32
    } else {
        (mp - 9) as u32
    };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_now_iso_format() {
        let s = now_iso();
        assert!(s.len() >= 20);
        assert!(s.ends_with('Z'));
        assert_eq!(&s[10..11], "T");
        assert_eq!(s.as_bytes()[4], b'-');
        assert_eq!(s.as_bytes()[7], b'-');
    }

    #[test]
    fn test_roundtrip_now() {
        let s1 = now_iso();
        let ms = rfc3339_to_millis(&s1).unwrap();
        let s2 = millis_to_rfc3339(ms);
        assert_eq!(s1, s2);
    }

    #[test]
    fn test_rfc3339_to_millis_known() {
        // 2026-07-22T12:34:56.789Z
        let ms = rfc3339_to_millis("2026-07-22T12:34:56.789Z").unwrap();
        assert!(ms > 0);
        let back = millis_to_rfc3339(ms);
        assert_eq!(back, "2026-07-22T12:34:56.789Z");
    }

    #[test]
    fn test_epoch() {
        let ms = rfc3339_to_millis("1970-01-01T00:00:00.000Z").unwrap();
        assert_eq!(ms, 0);
    }

    #[test]
    fn test_millis_to_rfc3339_epoch() {
        assert_eq!(millis_to_rfc3339(0), "1970-01-01T00:00:00.000Z");
    }

    #[test]
    fn test_millis_to_rfc3339_known() {
        assert_eq!(
            millis_to_rfc3339(1000),
            "1970-01-01T00:00:01.000Z"
        );
        assert_eq!(
            millis_to_rfc3339(86400000),
            "1970-01-02T00:00:00.000Z"
        );
    }

    #[test]
    fn test_invalid_inputs() {
        assert!(rfc3339_to_millis("").is_none());
        assert!(rfc3339_to_millis("not a date").is_none());
        assert!(rfc3339_to_millis("2026-13-01T00:00:00.000Z").is_none());
        assert!(rfc3339_to_millis("2026-00-01T00:00:00.000Z").is_none());
    }
}
