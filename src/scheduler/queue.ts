/**
 * P05-SCH-QUEUE — Base Job Queue (min-heap)
 *
 * Core data structure for all scheduler queues. Uses an array-based binary
 * heap for O(log n) insert and extract-min. Ordering by priority then FIFO.
 */

import type { SchedulingUnit, SchedulingPriority } from "./scheduler-types"
import { PRIORITY_NUMERIC } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Heap Entry
// ---------------------------------------------------------------------------

interface HeapEntry {
  readonly unit: SchedulingUnit
  readonly insertionOrder: number
}

// ---------------------------------------------------------------------------
// Comparator: priority first, then FIFO insertion order
// ---------------------------------------------------------------------------

function compareEntries(a: HeapEntry, b: HeapEntry): number {
  const prioA = PRIORITY_NUMERIC[a.unit.priority]
  const prioB = PRIORITY_NUMERIC[b.unit.priority]
  if (prioA !== prioB) return prioA - prioB
  return a.insertionOrder - b.insertionOrder
}

// ---------------------------------------------------------------------------
// MinHeap — array-based binary heap
// ---------------------------------------------------------------------------

export class MinHeap {
  private readonly entries: HeapEntry[] = []

  get size(): number {
    return this.entries.length
  }

  get isEmpty(): boolean {
    return this.entries.length === 0
  }

  peek(): SchedulingUnit | undefined {
    return this.entries[0]?.unit
  }

  insert(unit: SchedulingUnit, insertionOrder: number): void {
    const entry: HeapEntry = { unit, insertionOrder }
    this.entries.push(entry)
    this.bubbleUp(this.entries.length - 1)
  }

  extractMin(): SchedulingUnit | undefined {
    if (this.entries.length === 0) return undefined
    const min = this.entries[0]
    if (!min) return undefined
    const last = this.entries.pop()
    if (last && this.entries.length > 0) {
      this.entries[0] = last
      this.bubbleDown(0)
    }
    return min.unit
  }

  remove(unitId: string): SchedulingUnit | undefined {
    const idx = this.entries.findIndex((e) => e.unit.id === unitId)
    if (idx === -1) return undefined
    const removed = this.entries[idx]
    if (!removed) return undefined
    const last = this.entries.pop()
    if (last && idx < this.entries.length) {
      this.entries[idx] = last
      this.bubbleUp(idx)
      this.bubbleDown(idx)
    }
    return removed.unit
  }

  toArray(): readonly SchedulingUnit[] {
    return [...this.entries].sort(compareEntries).map((e) => e.unit)
  }

  clear(): void {
    this.entries.length = 0
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2)
      const current = this.entries[idx]
      const parent = this.entries[parentIdx]
      if (current && parent && compareEntries(current, parent) < 0) {
        this.swap(idx, parentIdx)
        idx = parentIdx
      } else {
        break
      }
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.entries.length
    while (true) {
      const left = 2 * idx + 1
      const right = 2 * idx + 2
      let smallest = idx

      const leftEntry = left < length ? this.entries[left] : undefined
      const smallestEntry = this.entries[smallest]
      if (leftEntry && smallestEntry && compareEntries(leftEntry, smallestEntry) < 0) {
        smallest = left
      }

      const rightEntry = right < length ? this.entries[right] : undefined
      const currentSmallest = this.entries[smallest]
      if (rightEntry && currentSmallest && compareEntries(rightEntry, currentSmallest) < 0) {
        smallest = right
      }
      if (smallest === idx) break

      this.swap(idx, smallest)
      idx = smallest
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.entries[a]
    const other = this.entries[b]
    if (tmp && other) {
      this.entries[a] = other
      this.entries[b] = tmp
    }
  }
}

// ---------------------------------------------------------------------------
// JobQueue — wraps MinHeap with scheduling-aware operations
// ---------------------------------------------------------------------------

export class JobQueue {
  private readonly heap = new MinHeap()
  private insertionCounter = 0

  get size(): number {
    return this.heap.size
  }

  get isEmpty(): boolean {
    return this.heap.isEmpty
  }

  enqueue(unit: SchedulingUnit): void {
    this.heap.insert(unit, this.insertionCounter++)
  }

  dequeue(): SchedulingUnit | undefined {
    return this.heap.extractMin()
  }

  remove(unitId: string): SchedulingUnit | undefined {
    return this.heap.remove(unitId)
  }

  peek(): SchedulingUnit | undefined {
    return this.heap.peek()
  }

  toArray(): readonly SchedulingUnit[] {
    return this.heap.toArray()
  }

  contains(unitId: string): boolean {
    return this.toArray().some((u) => u.id === unitId)
  }

  findByKind(kind: SchedulingUnit["kind"]): readonly SchedulingUnit[] {
    return this.toArray().filter((u) => u.kind === kind)
  }

  findByPriority(priority: SchedulingPriority): readonly SchedulingUnit[] {
    return this.toArray().filter((u) => u.priority === priority)
  }

  findHighestPriority(): SchedulingUnit | undefined {
    return this.heap.peek()
  }

  clear(): void {
    this.heap.clear()
    this.insertionCounter = 0
  }
}
