import base64
import uvicorn
from io import BytesIO
from PIL import Image
from typing import List

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch


# 起動用コマンドuvicorn server:app --reload

# 確認用URLhttp://localhost:8000/docs
class DetectResult(BaseModel):
    className: str
    x: float
    y: float
    w: float
    h: float


class DetectResults(BaseModel):
    results: List[DetectResult]


async def detect(img: Image):
    results = model(img)
    objects = results.pandas().xyxy[0]  # 検出結果を取得してobjectに格納
    # objectに格納したデータ
    # => バウンディングBOX左上のx座標とy座標、信頼度、クラスラベル、物体名
    imgx, imgy = img.size
    detectedResults: List[DetectResult] = []
    for i in range(len(objects)):

        name = objects.name[i]
        xmin = objects.xmin[i]
        ymin = objects.ymin[i]
        width = objects.xmax[i] - objects.xmin[i]
        height = objects.ymax[i] - objects.ymin[i]
        obj: DetectResult = {
            "className": name,
            "x": xmin/imgx,
            "y": ymin/imgy,
            "w": width/imgx,
            "h": height/imgy
        }
        detectedResults.append(obj)
        print({i}, {name}, {xmin}, {ymin}, {width}, {height})

    return detectedResults


model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True)
app = FastAPI()

origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/detect/", response_model=List[DetectResult])
async def create_upload_file(file: UploadFile = File(...)):
    print(file)
    response: List[DetectResult] = []
    try:
        data = await file.read()  # アップロードされた画像をbytesに変換する処理

        bin_data: bytes = base64.b64encode(data).decode()
        img = Image.open(file.file)
        print(img)
        result = await detect(img)
        response = result
        print(response)
    except Exception as e:
        print(e)

    return response
