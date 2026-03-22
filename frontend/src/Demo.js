import React, { memo } from 'react'

function Demo({ count2, incrementCount2 }) {
    console.log("demo called")
  return (
    <div>
      {'count2: ' + count2}
      <button onClick={incrementCount2}>Increase Count2</button>
    </div>
  )
}

export default memo(Demo)