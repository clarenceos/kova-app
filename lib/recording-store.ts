/**
 * IndexedDB persistence for recording blobs.
 *
 * Provides a durable backup so that recorded video survives React context
 * resets, navigation races, page refreshes, and JS errors.
 *
 * Every public function is wrapped in try-catch — IndexedDB failures must
 * NEVER crash the recording or playback flow.
 */

const DB_NAME = 'kova-recordings'
const STORE_NAME = 'latest'
const KEY = 'recording'
const TTL_MS = 86_400_000 // 24 hours

interface StoredRecording {
  blob: Blob
  mimeType: string
  serial: string
  weightKg: number
  discipline: string
  disciplineLabel: string
  savedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveRecording(
  blob: Blob,
  mimeType: string,
  serial: string,
  weightKg: number,
  discipline: string,
  disciplineLabel: string,
): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record: StoredRecording = { blob, mimeType, serial, weightKg, discipline, disciplineLabel, savedAt: Date.now() }
    store.put(record, KEY)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('recording-store: saveRecording failed', err)
  }
}

export async function restoreRecording(): Promise<{
  blob: Blob
  mimeType: string
  serial: string
  weightKg: number
  discipline: string
  disciplineLabel: string
} | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(KEY)
    const result = await new Promise<StoredRecording | undefined>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredRecording | undefined)
        request.onerror = () => reject(request.error)
      },
    )
    db.close()

    if (!result) return null
    if (Date.now() - result.savedAt > TTL_MS) return null

    return {
      blob: result.blob,
      mimeType: result.mimeType,
      serial: result.serial,
      weightKg: result.weightKg ?? 0,
      discipline: result.discipline ?? '',
      disciplineLabel: result.disciplineLabel ?? '',
    }
  } catch (err) {
    console.warn('recording-store: restoreRecording failed', err)
    return null
  }
}

export async function appendChunk(chunk: Blob): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get('chunks')
      getReq.onsuccess = () => {
        const existing: Blob[] = getReq.result ?? []
        const putReq = store.put([...existing, chunk], 'chunks')
        putReq.onsuccess = () => resolve()
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
    db.close()
  } catch {
    // Never crash the recording
  }
}

export async function assembleChunks(mimeType: string): Promise<Blob | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get('chunks')
      req.onsuccess = () => {
        const chunks: Blob[] | undefined = req.result
        if (!chunks || chunks.length === 0) { resolve(null); return }
        resolve(new Blob(chunks, { type: mimeType }))
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function clearChunks(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete('chunks')
      tx.oncomplete = () => resolve()
    })
    db.close()
  } catch {
    // Never crash
  }
}

export async function clearRecording(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(KEY)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('recording-store: clearRecording failed', err)
  }
}
