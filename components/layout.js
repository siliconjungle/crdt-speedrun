import Stack from 'components/stack'

const Layout = ({ children }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1em',
        width: '100%',
        paddingBottom: '3em',
      }}
    >
      <Stack
        direction="column"
        gap="1.5em"
        style={{
          width: '100%',
          maxWidth: '800px',
          height: '100%',
        }}
      >
        {children}
      </Stack>
    </div>
  )
}

export default Layout
