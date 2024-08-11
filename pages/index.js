import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react'
import { nanoid } from 'nanoid'
import useDocument from 'lib/use-document'
import Stack from 'components/stack'
import Card from 'components/card'
import Layout from 'components/layout'
import fonts from 'lib/fonts'

const sortedFonts = [...fonts].sort((a, b) => b.score - a.score)

const Home = forwardRef(({ onSendSnapshot, side }, ref) => {
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

  const selectedFont = sortedFonts[value.fontIndex ?? 0]

  useEffect(() => {
    const existingLink = document.getElementById(`dynamic-font-${side}`)
    if (existingLink) {
      existingLink.remove()
    }

    const link = document.createElement('link')
    link.id = `dynamic-font-${side}`
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${selectedFont.family.replace(/ /g, '+')}&display=swap`
    document.head.appendChild(link)
  }, [selectedFont, side])

  const createCollection = () => {
    setValueAtPath(['rows'], 'array', [])
    setValueAtPath(['color'], 'string', '#000000')
    setValueAtPath(['borderRadius'], 'number', 0)
    setValueAtPath(['fontIndex'], 'number', 0)

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
        <label
          htmlFor="color"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          Background Color {value.color}
          <input
            id="color"
            type="color"
            value={value.color}
            onChange={(e) => {
              setValueAtPath(['color'], 'string', e.target.value)
              flushChanges()
            }}
            style={{
              color: 'white',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          />
        </label>
      )}
      {value.rows && (
        <label
          htmlFor="borderRadius"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          Border Radius {value.borderRadius ?? 0}
          <input
            id="borderRadius"
            type="range"
            min="0"
            max="100"
            value={value.borderRadius ?? 0}
            onChange={(e) => {
              setValueAtPath(['borderRadius'], 'number', parseInt(e.target.value))
              flushChanges()
            }}
            style={{
              color: 'white',
              cursor: 'pointer',
              backgroundColor: '',
            }}
          />
        </label>
      )}
      {value.rows && (
        <label
          htmlFor="fontSlider"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          Font Style {selectedFont.family}
          <input
            id="fontSlider"
            type="range"
            min="0"
            max={sortedFonts.length - 1}
            value={value?.fontIndex ?? 0}
            onChange={(e) => {
              setValueAtPath(['fontIndex'], 'number', parseInt(e.target.value))
              flushChanges()
            }}
            style={{
              color: 'white',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          />
        </label>
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
                borderRadius: `${value.borderRadius ?? 0}px`,
              }}
            >
              <Stack
                direction="column"
                gap="1em"
              >
                <textarea
                  className="container card"
                  style={{
                    fontFamily: selectedFont.family,
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
            maxWidth: '50%',
            overflow: 'auto',
          }}
        >
          <h2>Left</h2>
          <Home
            onSendSnapshot={handleSendSnapshotToRight}
            ref={leftTrialRef}
            side="left"
          />
        </Stack>
        <Stack
          direction="column"
          gap="1em"
          style={{
            flex: 1,
            maxWidth: '50%',
            overflow: 'auto',
          }}
        >
          <h2>Right</h2>
          <Home
            onSendSnapshot={handleSendSnapshotToLeft}
            ref={rightTrialRef}
            side="right"
          />
        </Stack>
      </Stack>
    </Layout>
  )
}

export default WrappedHome
