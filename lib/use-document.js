import { useState, useRef } from 'react'
import { nanoid } from 'nanoid'
import Document from 'lib/document'
import { PositionSource, findPosition } from 'position-strings'

const useDocument = () => {
  const doc = useRef(new Document())
  const [value, setValue] = useState({})
  const [agentId, setAgentId] = useState(nanoid())
  const positionSource = useRef(new PositionSource())

  // path is an array of strings. [key, key2, key3]
  // the last element is the key to the child, the other elements are the path of the parent.
  const setValueAtPath = (path, type, value) => {
    if (!doc.current) {
      return
    }

    if (!doc.current.isValidTypeAndValue(type, value)) {
      return false
    }

    const parentPath = path.slice(0, -1)
    const key = path[path.length - 1]

    const uuid = doc.current.getUuidByPath(parentPath)

    if (!uuid) {
      return false
    }

    const { agentId: parentAgentId, sequenceNumber: parentSequenceNumber } = uuid
    const latestSequenceNumber = doc.current.getLatestGlobalSequenceNumber()

    const change = {
      operation: 'set',
      agentId,
      sequenceNumber: latestSequenceNumber + 1,
      parentAgentId,
      parentSequenceNumber,
      type,
      key,
      value,
    }

    doc.current.addChange(change)
  }

  const removeValueAtPath = (path) => {
    if (!doc.current) {
      return
    }

    const uuid = doc.current.getUuidByPath(path)

    if (!uuid) {
      return false
    }

    const { agentId, sequenceNumber } = uuid

    return doc.current.removeChange(agentId, sequenceNumber)
  }

  const flushChanges = () => {
    if (!doc.current) {
      return
    }

    const changes = doc.current.flushChanges()

    setValue(doc.current.value)
  }

  const getSnapshot = () => {
    if (!doc.current) {
      return null
    }

    return doc.current.getSnapshot()
  }

  const mergeSnapshot = (snapshot) => {
    if (!doc.current) {
      return
    }

    doc.current.mergeSnapshot(snapshot)
  }

  const pushValueAtPath = (path, type, value) => {
    if (!doc.current) {
      return
    }

    const uuid = doc.current.getUuidByPath(path)

    const childKeys = doc.current.getShallowChildKeys(uuid.agentId, uuid.sequenceNumber)

    const sortedKeys = childKeys.sort()
    const leftPosition = sortedKeys[sortedKeys.length - 1]

    const newPosition = positionSource.current.createBetween(leftPosition, PositionSource.LAST)

    setValueAtPath([...path, newPosition], type, value)

    return newPosition
  }

  const getKeyByParentPathAndIndex = (parentPath, index) => {
    if (!doc.current) {
      return
    }

    const uuid = doc.current.getUuidByPath(parentPath)

    if (!uuid) {
      return null
    }

    return doc.current.getKeyByIndex(uuid, index)
  }

  return {
    value,
    setValueAtPath,
    pushValueAtPath,
    removeValueAtPath,
    flushChanges,
    getSnapshot,
    mergeSnapshot,
    getKeyByParentPathAndIndex,
  }
}

export default useDocument
