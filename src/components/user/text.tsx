type UTextProps = {
  text: string,
  fontSize: number,
}

export default function UText({ text, fontSize }: UTextProps) {
  return (
    <div>
      <p style={{fontSize}}>{text}</p>
    </div>
  )
}