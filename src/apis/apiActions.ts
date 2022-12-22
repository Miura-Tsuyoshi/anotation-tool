import { request } from "http";



const fetchHandler = async (url: string, body?: any) => {
    let result: Response
    if (body) {
        let requestOptions = {
            method: 'POST',
            body: body
        };
        result = await fetch(url, requestOptions)
    }
    else {
        result = await fetch(url)
    }
    console.log(result)
    const json = result.json()
    return json

}

export const detectObjctApi = async (url: string, imageData: any) => {
    const formdata = new FormData()
    formdata.append('file', imageData)
    return await fetchHandler(url, formdata)
}