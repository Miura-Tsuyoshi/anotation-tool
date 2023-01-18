import { validateHeaderName } from 'http';
import { url } from 'inspector';
import JSZip from 'jszip';
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { resourceLimits } from 'worker_threads';
import { detectObjctApi } from './apis/apiActions';
import './App.css';
import CustomImageInput from './atoms/customImageInput';

type Point = {
  x: number;
  y: number;
  isClicked: boolean;
}
type DetecedObject = Point[]

type DetectedObjects = DetecedObject[][]

type ObjectPointData = {
  objIndex: number,
  pointIndex: number,
  point: Point
}

type FileBlobData = {
  fileName: string
  textBlob?: Blob
  ImageBlob?: Blob
  imageURL?: string
}

function App() {

  const [timerId, setTimerId] = useState<NodeJS.Timer>()
  const [originCanvas, setOriginCanvas] = useState<HTMLCanvasElement | null>(null)//canvasの中身
  const [detectedObjects, setDetectedObjects] = useState<DetectedObjects>([])//現在の画像の
  const [outputFileBlobs, setOutputFIleBlob] = useState<FileBlobData[]>([])
  const [className, setClassName] = useState<string>("")
  const [loaded, setLoaded] = useState(false)
  const [objFrameRenderedCount, setObjFrameRenderedCount] = useState<number>(0)
  const [mouseUpTime, setMouseUpTime] = useState<number>(0)
  const [clickedPoint, setClickedPoint] = useState<Point>({ x: 0, y: 0, isClicked: false })
  const [currentClickingObjectPoint, setCurrentClickingObjectPoint] = useState<ObjectPointData>({
    objIndex: 0, pointIndex: 0, point: {
      x: 0, y: 0, isClicked: false
    }
  })
  const [apiurl, setApiUrl] = useState<string>("")
  const [imgPaths, setImgPaths] = useState<string[]>([]);
  const [inputFileNames, setInputFileNames] = useState<string[]>([])
  const [currentImgIndex, setCurrentImgIndex] = useState<number>(0)
  const [postTime, setPostTime] = useState<number>(0)
  const [part1Time, setPart1Time] = useState<number>(0)
  const [par2Time, setPart2Time] = useState<number>(0)


  const originCanvas_width = 1280
  const originCanvas_height = 720
  const startBoxSize = 16
  // console.log(clickedTime, currentTime, isClicked, clickedPoint)
  //console.log(currentImgIndex, detectedObjects)



  useEffect(() => {
    const origin = document.getElementById("originImage") as HTMLCanvasElement
    setOriginCanvas(origin)
    origin.addEventListener('keypress', handleKeyPress)

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
        originCanvasContext.fillStyle = "rgb(255,255,255)"
        originCanvasContext.fillRect(0, 0, originCanvas_width, originCanvas_height)

        originCanvasContext.drawImage(img, 0, 0, img.width / ratio, img.height / ratio)
        const lineLength = objFrameRenderedCount + startBoxSize

        originCanvasContext.strokeStyle = "linear-gradient(315deg, #85FFBD 0%, #050005 19%, #00ff42 39%, #000000 60%, #15de58 80%, #000000 100%)"
        originCanvasContext.strokeRect(clickedPoint.x - lineLength / 2, clickedPoint.y - lineLength / 2, lineLength, lineLength)

        // 更にこれに続いて何か処理をしたい場合
        setLoaded(true)
      }
    }
  }, [originCanvas, currentImgIndex, imgPaths, clickedPoint, objFrameRenderedCount])


  const update = () => {
    console.log("update中", clickedPoint.isClicked, objFrameRenderedCount)
    if (clickedPoint.isClicked === false) {
      clearInterval(timerId)
    }
    setObjFrameRenderedCount(objFrameRenderedCount => objFrameRenderedCount + 3)
  }


  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement> | any) => {
    if (!e.target.files) return;

    // React.ChangeEvent<HTMLInputElement>よりファイルを取得
    const urls: string[] = [...imgPaths]
    const names: string[] = [...inputFileNames]
    setPostTime(Date.now())
    Promise.all(Array.from(Array(e.target.files.length).keys()).map(async (i: number) => {
      return detectObjctApi("https://a0dd-125-205-139-13.jp.ngrok.io", e.target.files[i])
    })).then((result: any[][]) => {
      setPart1Time(Date.now())
      console.log(result)
      const newObjs = result.map((objs) => objs.map((obj): Point[] => {
        return (
          [{
            x: obj.x * originCanvas_width,
            y: obj.y * originCanvas_height,
            isClicked: false,
          }, {
            x: (obj.x + obj.w) * originCanvas_width,
            y: obj.y * originCanvas_height,
            isClicked: false,
          }, {
            x: obj.x * originCanvas_width,
            y: (obj.y + obj.h) * originCanvas_height,
            isClicked: false,
          }, {
            x: (obj.x + obj.w) * originCanvas_width,
            y: (obj.y + obj.h) * originCanvas_height,
            isClicked: false,
          }
          ]

        )
      }))
      setDetectedObjects(newObjs)
    }).catch(() => {
      const newObjs = new Array(e.target.files.length).fill([])
      setDetectedObjects(newObjs)
    })

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
  }

  const deleteImage = (index: number) => {
    let newUrls = [...imgPaths]
    let newInputFileNames = [...inputFileNames]
    let newDetectedObjs = [...detectedObjects]
    newUrls.splice(index, 1)
    newInputFileNames.splice(index, 1)
    newDetectedObjs.splice(index, 1)
    setImgPaths(newUrls)
    setInputFileNames(newInputFileNames)
    setDetectedObjects(newDetectedObjs)
    if (newUrls.length - 1 < currentImgIndex && newUrls.length > 0) {
      setCurrentImgIndex(newUrls.length - 1)
    }
  }
  const onMouseDownImage = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (loaded && Date.now() - mouseUpTime > 150 && e.button === 0) {
      console.log(timerId)
      setClickedPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, isClicked: true })
      setObjFrameRenderedCount(objFrameRenderedCount + 1)
      clearInterval(timerId)
      const timer = setInterval(update, 50)
      setTimerId(timer)

    }

  }

  const onMouseMoveImage = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (clickedPoint.isClicked) {
      setClickedPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, isClicked: true })
    }
    else if (currentClickingObjectPoint.point.isClicked && e.shiftKey) {
      const newObjs = [...detectedObjects]
      const { objIndex, pointIndex } = currentClickingObjectPoint
      newObjs[currentImgIndex][objIndex] = newObjs[currentImgIndex][objIndex].map((point, i) => {

        const newPoint = { ...point }
        console.log(currentClickingObjectPoint, point, e.nativeEvent.movementX, e.nativeEvent.movementY)
        const sum = pointIndex + i
        if (pointIndex == i) {
          newPoint.x += e.nativeEvent.movementX
          newPoint.y += e.nativeEvent.movementY
        }
        else if (sum == 3) {

        }
        else if (sum % 2 == 0) {
          newPoint.x += e.nativeEvent.movementX
        }
        else if (sum % 2 == 1) {
          newPoint.y += e.nativeEvent.movementY
        }
        return newPoint
      })
      console.log(e, "move")
      console.log(currentClickingObjectPoint)

      const newClickPoint = { ...currentClickingObjectPoint.point }
      newClickPoint.x += e.nativeEvent.movementX
      newClickPoint.y += e.nativeEvent.movementY
      setDetectedObjects(newObjs)
      setCurrentClickingObjectPoint({
        ...currentClickingObjectPoint,
        point: newClickPoint,
      })
    }
  }

  const onMouseUpImage = (e: React.MouseEvent<HTMLCanvasElement>,) => {
    e.preventDefault()
    clearInterval(timerId)
    setMouseUpTime(Date.now())

    //4角補正
    if (clickedPoint.isClicked) {
      const lineLength = objFrameRenderedCount + startBoxSize
      const halfLength = lineLength / 2

      const newPoint = { ...clickedPoint }

      if (clickedPoint.x + halfLength > originCanvas_width) {
        newPoint.x = originCanvas_width - halfLength
      }
      if (clickedPoint.x - halfLength < 0) {
        newPoint.x = halfLength
      }
      if (clickedPoint.y + halfLength > originCanvas_height) {
        newPoint.y = originCanvas_height - halfLength
      }
      if (clickedPoint.y - halfLength < 0) {
        newPoint.y = halfLength
      }
      let objs = [...detectedObjects]
      objs[currentImgIndex].push([{
        x: newPoint.x - halfLength,
        y: newPoint.y - halfLength,
        isClicked: false,
      }, {
        x: newPoint.x + halfLength,
        y: newPoint.y - halfLength,
        isClicked: false,
      }, {
        x: newPoint.x - halfLength,
        y: newPoint.y + halfLength,
        isClicked: false,
      }, {
        x: newPoint.x + halfLength,
        y: newPoint.y + halfLength,
        isClicked: false,
      }
      ])
      setDetectedObjects(objs)
      setObjFrameRenderedCount(0)
      setClickedPoint({ x: 0, y: 0, isClicked: false })
    }
    if (currentClickingObjectPoint.point.isClicked) {
      setCurrentClickingObjectPoint({
        ...currentClickingObjectPoint,
        point: {
          ...currentClickingObjectPoint.point,
          isClicked: false
        }
      })
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


    setClickedPoint({ x: 0, y: 0, isClicked: false })
    setCurrentImgIndex(nextIndex)
  }

  const onClickSaveData = async () => {

    let files: FileBlobData[] = outputFileBlobs
    const classFile: FileBlobData = {
      fileName: "classes",
      textBlob: new Blob([className], { type: "text/utf-8" })
    }
    files.push(classFile)
    await generateZipBlob(files).then((zipBlob) => {
      saveBlob(zipBlob)
    }).then(() => {
      setPart2Time(Date.now())
    })
  }

  const getCurrentLabelBlob = (obj: DetecedObject): FileBlobData => {
    const scaledObjData = {
      centerX: (obj[3].x + obj[0].x) / 2 / originCanvas_width,
      centerY: (obj[3].y + obj[0].y) / 2 / originCanvas_height,
      width: (obj[3].x - obj[0].x) / originCanvas_width,
      height: (obj[3].y - obj[0].y) / originCanvas_height,
    }
    const txtData: string = `0 ${scaledObjData.centerX.toFixed(6)} ${scaledObjData.centerY.toFixed(6)} ${scaledObjData.width.toFixed(6)} ${scaledObjData.height.toFixed(6)} `
    const txtBlob: FileBlobData = {
      fileName: inputFileNames[currentImgIndex],
      textBlob: new Blob([txtData], { type: "text/utf-8" })
    }
    return txtBlob
  }
  const handleKeyPress = (e: KeyboardEvent) => {
    e.preventDefault()
    if (e.shiftKey) {
      if (e.key === 'a' || e.key === 'A') {
        changeImage(-1)
      }
      if (e.key === 'd' || e.key === 'D') {
        changeImage(1)
      }
    }

  }
  const onLeftClickFrame = (e: React.MouseEvent<HTMLDivElement>, objIndex: number, obj: DetecedObject) => {
    e.preventDefault()
    if (e.shiftKey === false) {
      const currentFrameFileLabel = getCurrentLabelBlob(obj)
      const newFiles = [...outputFileBlobs]
      originCanvas?.toBlob(blob => {
        currentFrameFileLabel.ImageBlob = blob as Blob
        currentFrameFileLabel.imageURL = window.URL.createObjectURL(blob as Blob)
        newFiles.push(currentFrameFileLabel)
        setOutputFIleBlob(newFiles)
      })
      changeImage(1)
    }

  }

  const onRightClickFrame = (e: React.MouseEvent<HTMLDivElement>, objIndex: number) => {
    e.preventDefault()
    const objs = [...detectedObjects]
    objs[currentImgIndex].splice(objIndex, 1)
    setDetectedObjects(objs)

  }
  const onClickObjectFrame = (e: React.MouseEvent<HTMLDivElement>, objIndex: number, pointIndex: number, point: Point) => {
    e.preventDefault()
    const newPoint = point
    newPoint.isClicked = true
    setCurrentClickingObjectPoint({
      objIndex: objIndex,
      pointIndex: pointIndex,
      point: newPoint
    })
  }

  // const onDragObjectFrame = (e: React.MouseEvent<HTMLDivElement>, objIndex: number, pointIndex: number, targetPoint: Point) => {
  //   e.preventDefault()
  //   const newObjs = [...detectedObjects]
  //   if (currentClickingObjectPoint.point.isClicked === true) {
  //     console.log(e, "drag")
  //     newObjs[currentImgIndex] = newObjs[currentImgIndex].map(obj => obj.map((point) => {

  //       const newPoint = { ...point }
  //       if (targetPoint.x === point.x) {
  //         newPoint.x += e.nativeEvent.movementX
  //       }
  //       if (targetPoint.y === point.y) {
  //         newPoint.y += e.nativeEvent.movementY
  //       }
  //       return newPoint
  //     }))

  //   }
  //   setDetectedObjects(newObjs)
  // }

  return (
    <div className="App">
      <div>
        annotate
        <div>
          {`${part1Time},${par2Time},`}
          {`${Date.now()},${postTime},`}
          {`${part1Time ** (1 / 2)},${par2Time ** (1 / 2)}`}
        </div>
      </div>
      <div>
        1,画像を投稿
      </div>
      <div>
        2,推定された矩形を選択または矩形作成
      </div>
      <div>
        3,クラス名を入力する
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
      <div style={{ position: "relative" }} onContextMenu={(e) => e.preventDefault()}  >
        <canvas className={"originImage"}
          onMouseDown={onMouseDownImage}
          onMouseMove={onMouseMoveImage}
          onMouseUp={onMouseUpImage}
          onMouseLeave={onMouseUpImage}
          width={originCanvas_width}
          height={originCanvas_height}
          id="originImage"
          draggable={false}
        >

        </canvas>
        {detectedObjects.length > 0 &&
          detectedObjects[currentImgIndex].map((obj, objIndex) => {
            return <div style={{
              position: "absolute",
              left: obj[0].x,
              top: obj[0].y,
              width: obj[3].x - obj[0].x,
              height: obj[3].y - obj[0].y,
              border: "#3FF100 solid 2px"

            }} className='objframe' key={`obj-frame${objIndex}`}
              onClick={(e) => onLeftClickFrame(e, objIndex, obj)} onContextMenu={(e) => onRightClickFrame(e, objIndex)}>
              {
                obj.map((point: Point, pointIndex: number) => {
                  return (<div style={{
                    position: "absolute",
                    left: pointIndex % 2 === 0 ? -8 : undefined,
                    right: pointIndex % 2 === 1 ? -8 : undefined,
                    top: pointIndex <= 1 ? -8 : undefined,
                    bottom: pointIndex >= 2 ? -8 : undefined,
                    width: "16px",
                    height: "16px",
                    border: "black dashed 1px",
                    borderRadius: "8px",
                  }} onMouseDown={(e) => onClickObjectFrame(e, objIndex, pointIndex, point)}
                    //onMouseMove={(e) => onDragObjectFrame(e, objIndex, pointIndex, point)}
                    //onMouseUp={() => onMouseUpObjectFrame(objIndex, pointIndex)}
                    key={`point-obj${objIndex}-${pointIndex}`}
                  >
                  </div>)
                })
              }
            </div>
          })
        }
      </div>

      <button onClick={() => changeImage(-1)}>
        前の画像
      </button>
      <button onClick={() => changeImage(1)}>
        次の画像
      </button>
      <button onClick={onClickSaveData} disabled={outputFileBlobs.length === 0 || className.length === 0}>
        保存する
      </button>
      <div>
        クラス名
      </div>
      <input type="text" onChange={(e: ChangeEvent<HTMLInputElement>) => {
        setClassName(e.target.value)
      }}>
      </input>
      <div>選択済みのラベル{outputFileBlobs.filter((obj) => obj.textBlob != undefined).length}</div>



    </div >
  );
}

export default App;
