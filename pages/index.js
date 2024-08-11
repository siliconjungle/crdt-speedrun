import { useRef, useImperativeHandle, forwardRef } from 'react'
import { nanoid } from 'nanoid'
import useDocument from 'lib/use-document'
import Stack from 'components/stack'
import Card from 'components/card'
import Layout from 'components/layout'

const Home = forwardRef(({ onSendSnapshot }, ref) => {
  const {
    value,
    setValueAtPath,
    removeValueAtPath,
    flushChanges,
    getSnapshot,
    mergeSnapshot,
    pushValueAtPath,
    getKeyByParentPathAndIndex,
  } = useDocument()

  useImperativeHandle(ref, () => ({
    mergeSnapshot,
    flushChanges,
  }))

  const createCollection = () => {
    setValueAtPath(['rows'], 'array', [])
    setValueAtPath(['color'], 'string', 'transparent')

    flushChanges()
  }

  const addTile = () => {
    const position = pushValueAtPath(['rows'], 'object', {})
    setValueAtPath(['rows', position, 'id'], 'string', nanoid())
    setValueAtPath(['rows', position, 'content'], 'string', '')

    flushChanges()
  }

  const removeChangeByPath = (path) => {
    removeValueAtPath(path)

    flushChanges()
  }

  const handleSendSnapshot = () => {
    const snapshot = getSnapshot()
    onSendSnapshot(snapshot)
  }

  const rows = value.rows || []

  return (
    <>
      <button
        onClick={createCollection}
        className="container"
        style={{
          padding: '1em',
          color: 'white',
          cursor: 'pointer',
          backgroundColor: 'transparent',
        }}
      >
        Create Collection
      </button>
      <button
        onClick={handleSendSnapshot}
        className="container"
        style={{
          padding: '1em',
          color: 'white',
          cursor: 'pointer',
          backgroundColor: 'transparent',
        }}
      >
        Send Snapshot
      </button>
      {value.rows && (
        <input
          type="color"
          value={value.color}
          onChange={(e) => {
            setValueAtPath(['color'], 'string', e.target.value)
            flushChanges()
          }}
          className="container"
          style={{
            // padding: '1em',
            color: 'white',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        />
      )}
      <Stack
        direction="column"
        gap="1em"
        style={{
          backgroundColor: value.color ?? 'transparent',
          padding: '1em',
        }}
        className="container"
      >
        {rows.map((row, index) => {
          const key = getKeyByParentPathAndIndex(['rows'], index)

          return (
            <Card
              key={key}
              style={{
                minHeight: '200px',
              }}
            >
              <Stack
                direction="column"
                gap="1em"
              >
                <textarea
                  className="container card"
                  style={{
                    color: 'white',
                    resize: 'vertical',
                    padding: '1em',
                  }}
                  value={row.content}
                  onChange={(e) => {
                    setValueAtPath(['rows', key, 'content'], 'string', e.target.value)
                    flushChanges()
                  }}
                  placeholder="Write something..."
                />
                <button
                  onClick={() => removeChangeByPath(['rows', key])}
                  className="container"
                  style={{
                    padding: '1em',
                    color: 'white',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                  }}
                >
                  Remove Tile
                </button>
              </Stack>
            </Card>
          )
        })}
      </Stack>
      {value.rows && (
        <button
          onClick={addTile}
          className="container"
          style={{
            padding: '1em',
            color: 'white',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        >
          Add Tile
        </button>
      )}
    </>
  )
})

const WrappedHome = () => {
  const leftTrialRef = useRef()
  const rightTrialRef = useRef()

  const handleSendSnapshotToLeft = (snapshot) => {
    leftTrialRef.current.mergeSnapshot(snapshot)
    leftTrialRef.current.flushChanges()
  }

  const handleSendSnapshotToRight = (snapshot) => {
    rightTrialRef.current.mergeSnapshot(snapshot)
    rightTrialRef.current.flushChanges()
  }

  return (
    <Layout>
      <h1>JSON CRDT</h1>
      <Stack
        direction="row"
        gap="1em"
      >
        <Stack
          direction="column"
          gap="1em"
          style={{
            flex: 1,
          }}
        >
          <h2>Left</h2>
          <Home
            onSendSnapshot={handleSendSnapshotToRight}
            ref={leftTrialRef}
          />
        </Stack>
        <Stack
          direction="column"
          gap="1em"
          style={{
            flex: 1,
          }}
        >
          <h2>Right</h2>
          <Home
            onSendSnapshot={handleSendSnapshotToLeft}
            ref={rightTrialRef}
          />
        </Stack>
      </Stack>
    </Layout>
  )
}

export default WrappedHome
