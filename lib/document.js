import { findPosition } from 'position-strings'

export const SYSTEM_AGENT_ID = 'system'
export const ROOT_SEQUENCE_NUMBER = -1

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj))

class Document {
  document = {
    [SYSTEM_AGENT_ID]: {
      [ROOT_SEQUENCE_NUMBER]: {
        type: 'object',
        value: {},
        parent: null,
      },
    },
  }

  latestSequenceNumbers = {
    [SYSTEM_AGENT_ID]: ROOT_SEQUENCE_NUMBER,
  }

  latestGlobalSequenceNumber = ROOT_SEQUENCE_NUMBER

  children = {}

  unflushedChanges = []

  value = {}

  constructor () {}

  isLatestSequenceNumber (agentId, sequenceNumber) {
    return (this.latestSequenceNumbers[agentId] ?? ROOT_SEQUENCE_NUMBER) < sequenceNumber
  }

  getLatestGlobalSequenceNumber () {
    return this.latestGlobalSequenceNumber
  }

  hasChange (agentId, sequenceNumber) {
    return (this.document[agentId]?.[sequenceNumber] ?? false)
  }

  canHaveChildren (agentId, sequenceNumber) {
    // check if the "type" field is one that can have children. for now it's just "object" & "array".
    const change = this.getChange(agentId, sequenceNumber)

    return change?.type === 'object' || change?.type === 'array'
  }

  addChild (parentAgentId, parentSequenceNumber, childAgentId, childSequenceNumber, key) {
    this.children[parentAgentId] ??= {}
    this.children[parentAgentId][parentSequenceNumber] ??= {}
    this.children[parentAgentId][parentSequenceNumber][key] = { agentId: childAgentId, sequenceNumber: childSequenceNumber }
  }

  hasChildAtKey (parentAgentId, parentSequenceNumber, key) {
    return this.children[parentAgentId]?.[parentSequenceNumber]?.[key] ?? false
  }

  getChildAtKey (parentAgentId, parentSequenceNumber, key) {
    return this.children[parentAgentId]?.[parentSequenceNumber]?.[key] ?? null
  }

  getShallowChildKeys (parentAgentId, parentSequenceNumber) {
    return Object.keys(this.children[parentAgentId]?.[parentSequenceNumber] ?? {})
  }

  // the parent MUST be an array for this to work.
  getKeyByIndex (uuid, index) {
    const { agentId, sequenceNumber } = uuid

    // check if the element with the uuid IS an array.
    const change = this.getChange(agentId, sequenceNumber)

    if (!change || change.type !== 'array') {
      return null
    }

    const children = this.getShallowChildKeys(agentId, sequenceNumber)

    const sortedKeys = children.sort()

    return sortedKeys[index]
  }

  isValidTypeAndValue (type, value) {
    if (type === 'object') {
      return typeof value === 'object' && !Array.isArray(value) && value !== null && value !== undefined
    }

    if (type === 'boolean') {
      return typeof value === 'boolean'
    }

    if (type === 'number') {
      return typeof value === 'number'
    }

    if (type === 'string') {
      return typeof value === 'string'
    }

    if (type === 'null') {
      return value === null
    }

    if (type === 'array') {
      return Array.isArray(value)
    }

    return false
  }

  addChange (change) {
    const { agentId, sequenceNumber } = change

    if (!this.isLatestSequenceNumber(agentId, sequenceNumber)) {
      return false
    }

    if (this.hasChange(agentId, sequenceNumber)) {
      return false
    }

    const { parentAgentId, parentSequenceNumber, key, type, value } = change

    if (!this.isValidTypeAndValue(type, value)) {
      return false
    }

    if (!this.hasChange(parentAgentId, parentSequenceNumber)) {
      return false
    }

    if (!this.canHaveChildren(parentAgentId, parentSequenceNumber)) {
      return false
    }

    const currentChild = this.getChildAtKey(parentAgentId, parentSequenceNumber, key)

    if (currentChild) {
      this.removeChange(currentChild.agentId, currentChild.sequenceNumber)
    }

    this.document[agentId] ??= {}
    this.document[agentId][sequenceNumber] = change
    this.latestSequenceNumbers[agentId] = sequenceNumber
    this.addChild(parentAgentId, parentSequenceNumber, agentId, sequenceNumber, key)

    this.latestGlobalSequenceNumber = Math.max(this.latestGlobalSequenceNumber, sequenceNumber)

    this.unflushedChanges.push(change)

    return true
  }

  // path is an array of strings.
  getUuidByPath (path) {
    let agentId = SYSTEM_AGENT_ID
    let sequenceNumber = ROOT_SEQUENCE_NUMBER

    for (const key of path) {
      const child = this.getChildAtKey(agentId, sequenceNumber, key)

      if (!child) {
        return null
      }

      agentId = child.agentId
      sequenceNumber = child.sequenceNumber
    }

    return {
      agentId,
      sequenceNumber,
    }
  }

  getPath = (agentId, sequenceNumber) => {
    // jump to the element and go up towards the root, building its path.
    const path = []
    let currentAgentId = agentId
    let currentSequenceNumber = sequenceNumber

    while (currentAgentId !== SYSTEM_AGENT_ID || currentSequenceNumber !== ROOT_SEQUENCE_NUMBER) {
      const change = this.getChange(currentAgentId, currentSequenceNumber)

      if (!change) {
        return null
      }

      const { parentAgentId, parentSequenceNumber, key } = change

      path.unshift(key)

      currentAgentId = parentAgentId
      currentSequenceNumber = parentSequenceNumber
    }

    return path
  }

  getPathRemaining = (agentId, sequenceNumber) => {
    const path = []
    let currentAgentId = agentId
    let currentSequenceNumber = sequenceNumber

    while (currentAgentId !== SYSTEM_AGENT_ID || currentSequenceNumber !== ROOT_SEQUENCE_NUMBER) {
      const change = this.getChange(currentAgentId, currentSequenceNumber)

      if (!change) {
        return path
      }

      const { parentAgentId, parentSequenceNumber, key } = change

      path.unshift(key)

      currentAgentId = parentAgentId
      currentSequenceNumber = parentSequenceNumber
    }

    return path
  }

  applyRemoveToValue = (change) => {
    // this is a special kind of change for *unflushed changes*.
    const path = change.path
    const changeKey = path[path.length - 1]

    path.pop()

    let value = { ...this.value }
    let currentValue = value

    let parentAgentId = SYSTEM_AGENT_ID
    let parentSequenceNumber = ROOT_SEQUENCE_NUMBER

    for (const key of path) {
      // get the type of the parent.
      const parentChange = this.getChange(parentAgentId, parentSequenceNumber)

      if (!parentChange) {
        return false
      }

      const { type } = parentChange

      if (type === 'object') {
        if (!currentValue[key]) {
          return false
        }
        currentValue = { ...currentValue }
        currentValue = currentValue[key]
      } else if (type === 'array') {
        // get all the child keys of the parent.
        const children = this.getShallowChildKeys(parentAgentId, parentSequenceNumber)

        // we need to sort them by the keys.
        const sortedKeys = children.sort()

        // find the index of the key.
        const index = sortedKeys.indexOf(key)

        if (index === -1) {
          return false
        }

        if (!currentValue[index]) {
          return false
        }

        currentValue = [...currentValue]
        currentValue = currentValue[index]
      } else {
        return false
      }

      const child = this.getChildAtKey(parentAgentId, parentSequenceNumber, key)

      if (!child) {
        return false
      }

      parentAgentId = child.agentId
      parentSequenceNumber = child.sequenceNumber
    }

    const lastParent = this.getChange(parentAgentId, parentSequenceNumber)

    if (!lastParent) {
      return false
    }

    const { type } = lastParent

    if (type === 'array') {
      const children = this.getShallowChildKeys(parentAgentId, parentSequenceNumber)

      const sortedKeys = children.sort()

      const index = findPosition(changeKey, sortedKeys)
      // delete currentValue[index.index]
      // remove the element at the index.
      currentValue.splice(index.index, 1)
    } else if (type === 'object') {
      delete currentValue[changeKey]
    } else {
      return false
    }

    this.value = value

    return true
  }

  applySetToValue = (change) => {
    let path = this.getPath(change.agentId, change.sequenceNumber)

    if (!path) {
      return false
    }

    path.pop()

    let value = { ...this.value }
    let currentValue = value

    let parentAgentId = SYSTEM_AGENT_ID
    let parentSequenceNumber = ROOT_SEQUENCE_NUMBER

    for (const key of path) {
      const parentChange = this.getChange(parentAgentId, parentSequenceNumber)

      if (!parentChange) {
        return false
      }

      const { type } = parentChange

      if (type === 'object') {
        currentValue = { ...currentValue }
        currentValue = currentValue[key]
      } else if (type === 'array') {
        const children = this.getShallowChildKeys(parentAgentId, parentSequenceNumber)
        const sortedKeys = children.sort()
        const index = sortedKeys.indexOf(key)

        if (index === -1) {
          return false
        }

        currentValue = [...currentValue]
        currentValue = currentValue[index]
      } else {
        return false
      }

      const child = this.getChildAtKey(parentAgentId, parentSequenceNumber, key)

      if (!child) {
        return false
      }

      parentAgentId = child.agentId
      parentSequenceNumber = child.sequenceNumber
    }

    const lastParent = this.getChange(parentAgentId, parentSequenceNumber)

    if (!lastParent) {
      return false
    }

    const { type } = lastParent

    if (currentValue === undefined) {
      return false
    }

    if (type === 'array') {
      const children = this.getShallowChildKeys(parentAgentId, parentSequenceNumber)

      const sortedKeys = children.sort()

      const index = findPosition(change.key, sortedKeys)

      if (!index.isPresent) {
        return false
      }

      currentValue.splice(index.index, 0, change.value)
    } else if (type === 'object') {
      currentValue[change.key] = change.value
    } else {
      return false
    }

    this.value = value

    return true
  }

  applyChangeToValue = (change) => {
    if (change.operation === 'remove') {
      return this.applyRemoveToValue(change)
    } else if (change.operation === 'set') {
      return this.applySetToValue(change)
    }

    return false
  }

  flushChanges () {
    const changes = deepCopy(this.unflushedChanges)
    this.unflushedChanges = []

    for (const change of changes) {
      this.applyChangeToValue(change)
    }

    return changes
  }

  getChange (agentId, sequenceNumber) {
    const change = this.document[agentId]?.[sequenceNumber] ?? null

    return deepCopy(change)
  }

  removeChange (agentId, sequenceNumber) {
    if (!this.hasChange(agentId, sequenceNumber)) {
      return false
    }

    const path = this.getPath(agentId, sequenceNumber)

    const children = this.children[agentId]?.[sequenceNumber] ?? {}

    for (const key in children) {
      const { agentId, sequenceNumber } = children[key]
      this.removeChange(agentId, sequenceNumber)
    }

    const change = this.getChange(agentId, sequenceNumber)

    if (!change) {
      return false
    }

    delete this.children[agentId]?.[sequenceNumber]

    if (Object.keys(this.children[agentId] ?? {}).length === 0) {
      delete this.children[agentId]
    }

    const { parentAgentId, parentSequenceNumber, key } = change

    delete this.children[parentAgentId][parentSequenceNumber][key]

    if (Object.keys(this.children[parentAgentId][parentSequenceNumber] ?? {}).length === 0) {
      delete this.children[parentAgentId][parentSequenceNumber]
    }

    if (Object.keys(this.children[parentAgentId]).length === 0) {
      delete this.children[parentAgentId]
    }

    delete this.document[agentId][sequenceNumber]

    if (Object.keys(this.document[agentId]).length === 0) {
      delete this.document[agentId]
    }

    this.unflushedChanges.push({
      agentId,
      sequenceNumber,
      path,
      operation: 'remove',
      path,
    })

    return true
  }

  getSnapshot () {
    return (
      deepCopy({
        document: this.document,
        latestSequenceNumbers: this.latestSequenceNumbers,
        // this is not NECESSARY - but showing for now for debugging.
        children: this.children,
      })
    )
  }

  mergeSnapshot (snapshot) {
    const changesToRemove = []

    for (const agentId in this.document) {
      for (const sequenceNumber in this.document[agentId]) {
        if (!snapshot.document[agentId]?.[sequenceNumber]) {
          if (sequenceNumber <= snapshot.latestSequenceNumbers[agentId]) {
            changesToRemove.push({ agentId, sequenceNumber })
          }
        }
      }
    }

    for (const agentId in snapshot.document) {
      for (const sequenceNumber in snapshot.document[agentId]) {
        const change = snapshot.document[agentId][sequenceNumber]

        if (this.isLatestSequenceNumber(agentId, sequenceNumber)) {
          this.addChange(change)
        }
      }
    }

    for (const change of changesToRemove) {
      this.removeChange(change.agentId, change.sequenceNumber)
    }
  }
}

export default Document
