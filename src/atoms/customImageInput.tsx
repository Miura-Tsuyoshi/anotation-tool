import React, { useRef } from "react"

type InputProps = {
    multiple: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const CustomImageInput: React.FC<InputProps> = (props) => {
    const inputRef: any = useRef(null)
    return <>
        <input onChange={props.onChange} multiple={props.multiple} type="file" accept='image/*' hidden ref={inputRef} />
        <button onClick={() => {
            if (inputRef != null) {
                if (inputRef.current) {
                    inputRef.current.click()
                }
            }
        }}>
            画像をを追加
        </button>
    </>
}
export default CustomImageInput