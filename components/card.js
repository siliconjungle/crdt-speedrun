const Card = ({ children, noPadding, style }) => {
  return (
    <div
      className="container card"
      style={{
        padding: noPadding ? 0 : '1em',
        display: 'flex',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default Card
