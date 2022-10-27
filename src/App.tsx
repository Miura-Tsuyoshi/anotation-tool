import { validateHeaderName } from 'http';
import { url } from 'inspector';
import JSZip from 'jszip';
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import './App.css';
import CustomImageInput from './atoms/customImageInput';

type Point = {
  x: number;
  y: number;
}

type FileBlobData = {
  fileName: string
  textBlob?: Blob
  ImageBlob?: Blob
}

function App() {
  const [timerId, setTimerId] = useState<NodeJS.Timer>()
  const [originCanvas, setOriginCanvas] = useState<HTMLCanvasElement | null>(null)//canvasの中身
  const [cropedCanvas, setCropedCanvas] = useState<HTMLCanvasElement | null>(null)//canvasの中身
  const [shrinkRatio, setShrinkRatio] = useState<number>(1)
  const [outputFileBlobs, setOutputFIleBlob] = useState<FileBlobData[]>([])
  const [className, setClassName] = useState<string>("")
  const [loaded, setLoaded] = useState(false)
  const [clickedTime, setClickedTime] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [mouseUpTime, setMouseUpTime] = useState<number>(0)
  const [isClicked, setIsClicked] = useState<boolean>(false)
  const [clickedPoint, setClickedPoint] = useState<Point>({ x: 0, y: 0 })

  const [imgPaths, setImgPaths] = useState<string[]>([]);
  const [inputFileNames, setInputFileNames] = useState<string[]>([])
  const [currentImgIndex, setCurrentImgIndex] = useState<number>(0)


  const originCanvas_width = 640
  const originCanvas_height = 360
  // console.log(clickedTime, currentTime, isClicked, clickedPoint)



  useEffect(() => {
    const origin = document.getElementById("originImage") as HTMLCanvasElement
    const croped = document.getElementById("cropedImage") as HTMLCanvasElement
    setOriginCanvas(origin)
    setCropedCanvas(croped)

  }, [])
  useEffect(() => {
    if (originCanvas !== null) {
      const originCanvasContext = originCanvas.getContext("2d") as CanvasRenderingContext2D
      const img = new Image()
      img.src = imgPaths[currentImgIndex]// 描画する画像など
      img.onload = () => {
        const ratioFromWidth: number = img.width / originCanvas_width
        const ratioFromHeight: number = img.height / originCanvas_height
        const ratio: number = Math.max(ratioFromHeight, ratioFromWidth)
        setShrinkRatio(ratio)
        if (outputFileBlobs[currentImgIndex].ImageBlob === undefined) {
          originCanvasContext.drawImage(img, 0, 0, img.width / ratio, img.height / ratio)
          originCanvas.toBlob(blob => {
            const newFiles = [...outputFileBlobs]
            newFiles[currentImgIndex].ImageBlob = blob as Blob
            setOutputFIleBlob(newFiles)
          },)
        }
        originCanvasContext.fillStyle = "rgb(0,0,0)"
        originCanvasContext.fillRect(0, 0, originCanvas_width, originCanvas_height)

        originCanvasContext.drawImage(img, 0, 0, img.width / ratio, img.height / ratio)
        const lineLength = (currentTime - clickedTime) / 16 + 15

        originCanvasContext.strokeStyle = "linear-gradient(315deg, #85FFBD 0%, #050005 19%, #00ff42 39%, #000000 60%, #15de58 80%, #000000 100%)"
        originCanvasContext.strokeRect(clickedPoint.x - lineLength / 2, clickedPoint.y - lineLength / 2, lineLength, lineLength)

        // 更にこれに続いて何か処理をしたい場合
        setLoaded(true)
      }
    }
  }, [originCanvas, currentImgIndex, imgPaths, clickedPoint, currentTime])


  useEffect(() => {
    if (cropedCanvas !== null && isClicked === false) {
      const cropedCanvasContext = cropedCanvas.getContext("2d") as CanvasRenderingContext2D

      const img = new Image()
      img.src = imgPaths[currentImgIndex]// 描画する画像など
      img.onload = () => {
        cropedCanvasContext.fillStyle = "rgb(0,0,0)"
        cropedCanvasContext.fillRect(0, 0, 360, 360)
        const lineLength = (currentTime - clickedTime) / 16 + 15
        const startX = (clickedPoint.x - lineLength / 2) * shrinkRatio
        const startY = (clickedPoint.y - lineLength / 2) * shrinkRatio
        const cuttingWidth = lineLength * shrinkRatio
        const cuttingHeight = lineLength * shrinkRatio
        cropedCanvasContext.drawImage(img, startX, startY, cuttingWidth, cuttingHeight, 0, 0, 360, 360)



        // 更にこれに続いて何か処理をしたい場合
        setLoaded(true)
      }
    }
    if (isClicked === true) {
      clearInterval(timerId)
      const timer = setInterval(update, 50)
      setTimerId(timer)
      setCurrentTime(Date.now())
    }
  }, [isClicked])
  const update = () => {
    console.log("update中", isClicked)
    if (isClicked === false) {
      clearInterval(timerId)
    }
    setCurrentTime(Date.now())
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    console.log(e.target.files)

    // React.ChangeEvent<HTMLInputElement>よりファイルを取得
    const urls: string[] = [...imgPaths]
    const names: string[] = [...inputFileNames]
    for (let i = 0; i < e.target.files.length; i++) {
      const name = e.target.files[i].name
      console.log(name, inputFileNames.indexOf(name))
      if (inputFileNames.indexOf(name) === -1) {
        urls.push(window.URL.createObjectURL(e.target.files[i]))
        names.push(name)
      }
    }
    // オブジェクトURLを生成し、useState()を更新
    console.log(urls)
    setImgPaths(urls);
    setInputFileNames(names)
    setOutputFIleBlob(urls.map((val, index) => {
      const obj: FileBlobData = {
        fileName: (index + 1).toString()
      }
      return obj
    }))
  }

  const deleteImage = (index: number) => {
    let newUrls = [...imgPaths]
    let newInputFileNames = [...inputFileNames]
    let newOutputFileBlobs = [...outputFileBlobs]
    newUrls.splice(index, 1)
    newInputFileNames.splice(index, 1)
    newOutputFileBlobs.splice(index, 1)
    setImgPaths(newUrls)
    setInputFileNames(newInputFileNames)
    setOutputFIleBlob(newOutputFileBlobs)

    if (newUrls.length - 1 < currentImgIndex) {
      setCurrentImgIndex(newUrls.length - 1)
    }
  }
  const onMouseDownImage = (e: React.MouseEvent<HTMLCanvasElement>) => {
    switch (e.button) {
      case 0:

        if (loaded && Date.now() - mouseUpTime > 150) {
          console.log(timerId)
          setClickedPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
          setClickedTime(Date.now())
          setCurrentTime(Date.now())
          setIsClicked(true)
        }

    }
  }

  const onMouseMoveImage = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isClicked) {
      setClickedPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
    }
  }

  const onMouseUpImage = () => {
    clearInterval(timerId)
    setMouseUpTime(Date.now())
    setIsClicked(false)

    //4角補正

    const lineLength = (currentTime - clickedTime) / 16 + 15
    const halfLength = lineLength / 2

    const newPoint = { ...clickedPoint }
    let isChanged = false

    if (clickedPoint.x + halfLength > originCanvas_width) {
      newPoint.x = originCanvas_width - halfLength
      isChanged = true
    }
    if (clickedPoint.x - halfLength < 0) {
      newPoint.x = halfLength
      isChanged = true
    }
    if (clickedPoint.y + halfLength > originCanvas_height) {
      newPoint.y = originCanvas_height - halfLength
      isChanged = true
    }
    if (clickedPoint.y - halfLength < 0) {
      newPoint.y = halfLength
      isChanged = true
    }
    if (isChanged) {
      setClickedPoint(newPoint)
    }
  }



  const generateZipBlob = (datas: FileBlobData[]) => {

    const zip = new JSZip();

    const folder = zip.folder("train") as JSZip;

    datas.forEach(nameContentPair => {



      if (nameContentPair.ImageBlob) {
        const ImgName = nameContentPair.fileName + ".jpg";
        const ImgContent = nameContentPair.ImageBlob;
        folder.file(ImgName, ImgContent)
      }

      if (nameContentPair.textBlob) {
        const txtName = nameContentPair.fileName + ".txt";
        const txtContent = nameContentPair.textBlob;

        folder.file(txtName, txtContent);
      };
    });

    return zip.generateAsync({ type: 'blob' }); // デフォルトで無圧縮

  };

  const saveBlob = (blob: Blob,) => {

    const a: HTMLAnchorElement = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "train.zip"

    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  };
  const changeImage = (deltaIndex: number) => {
    let nextIndex = currentImgIndex + deltaIndex

    if (nextIndex < 0) {
      nextIndex = 0;
    }
    else if (nextIndex > imgPaths.length - 1) {
      nextIndex = imgPaths.length - 1
    }


    if (clickedTime !== 0) {
      const currentLabel = getCurrentLabelBlob()
      const index = outputFileBlobs.findIndex((element) => element.fileName === currentLabel.fileName)
      let newFiles = [...outputFileBlobs]
      newFiles[index].textBlob = currentLabel.textBlob
      setOutputFIleBlob(newFiles)
    }
    setClickedTime(0)
    setCurrentTime(0)
    setIsClicked(false)
    setClickedPoint({ x: 0, y: 0 })
    setCurrentImgIndex(nextIndex)
  }
  const onClickSaveData = async () => {

    let files: FileBlobData[] = outputFileBlobs
    const classFile: FileBlobData = {
      fileName: "classes",
      textBlob: new Blob([className], { type: "text/utf-8" })
    }
    if (clickedTime !== 0) {
      const currentLabel = getCurrentLabelBlob()
      const index = files.findIndex((element) => element.fileName === currentLabel.fileName)
      files[index].textBlob = currentLabel.textBlob
    }
    files.push(classFile)
    await generateZipBlob(files).then((zipBlob) => {
      saveBlob(zipBlob)
    })
  }

  const getCurrentLabelBlob = (): FileBlobData => {
    let scaledMidX = (clickedPoint.x / originCanvas_width)
    let scaledMidY = (clickedPoint.y / originCanvas_height)
    const lineLength = (currentTime - clickedTime) / 16 + 15
    const scaledWidth = (lineLength / originCanvas_width)
    const scaledHeight = (lineLength / originCanvas_height)

    //角の補正
    if (scaledMidX - scaledWidth < 0) {
      scaledMidX = scaledWidth / 2
    }
    if (scaledMidX + scaledWidth > 1) {
      scaledMidX = 1 - scaledWidth / 2
    }
    if (scaledMidY - scaledHeight < 0) {
      scaledMidY = scaledHeight / 2
    }
    if (scaledMidY + scaledHeight > 1) {
      scaledMidY = 1 - scaledHeight / 2
    }
    const txtData: string = `0 ${scaledMidX.toFixed(6)} ${scaledMidY.toFixed(6)} ${scaledWidth.toFixed(6)} ${scaledHeight.toFixed(6)} `
    const txtBlob: FileBlobData = {
      fileName: (currentImgIndex + 1).toString(),
      textBlob: new Blob([txtData], { type: "text/utf-8" })
    }
    return txtBlob
  }
  return (
    <div className="App">
      <div>
        画像アノテーションツール
      </div>
      <CustomImageInput multiple onChange={onFileChange} />
      <button onClick={() => {
        deleteImage(currentImgIndex)
      }}>
        選択中の画像を削除
      </button>
      {imgPaths.length > 0 && <div>
        {`${currentImgIndex + 1}/${imgPaths.length}`}
      </div>}
      <div>
        <canvas className={"originImage"}
          onMouseDown={onMouseDownImage}
          onMouseMove={onMouseMoveImage}
          onMouseUp={onMouseUpImage}
          onMouseLeave={onMouseUpImage}
          width={originCanvas_width}
          height={originCanvas_height}
          id="originImage"
          draggable={false}
        />
      </div>

      <div>
        <canvas className={"cropedImage"} width="360" height="360" id="cropedImage" />
      </div>
      <button onClick={() => changeImage(-1)}>
        前の画像
      </button>
      <button onClick={() => changeImage(1)}>
        次の画像
      </button>
      <button onClick={onClickSaveData} disabled={outputFileBlobs.length === 0}>
        保存する
      </button>
      <div>
        クラス名
      </div>
      <input type="text" onChange={(e: ChangeEvent<HTMLInputElement>) => {
        setClassName(e.target.value)
      }}>
      </input>
    </div >
  );
}

export default App;
