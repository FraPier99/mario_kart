import axios from 'axios'

const baseURL = 'http://localhost:8001'

const apiClient = axios.create({
    baseURL: baseURL,
    headers : {
        'Content-Type' : 'application/json'
    }
})

export const _get =(url)  =>{
    return  apiClient.get(url)
}

export default apiClient