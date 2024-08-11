const Stack = ({
  gap,
  direction,
  children,
  style,
  className = '',
  id,
  innerRef,
  onClick = () => {},
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        flexGrow: 1,
        ...style,
      }}
      className={className}
      id={id}
      ref={innerRef}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Stack
