import axios from "axios";

const API_URL = "http://127.0.0.1:3000";

export const getData = async (rout, params = {}, token = undefined, headers = undefined) => {
    try {

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(headers || {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            /*headers: headers || (token ? { Authorization: `Bearer ${token}` } : {}), */
            params
        };

        const response = await axios.get(`${API_URL}/${rout}`, config);

        return response.data;
    } catch (error) {
        console.error("Error while request:", error);
        return [];
    }
};

export const postData = async (rout, params = {}, token = undefined, headers = undefined) => {
    try {
        const config = {
            headers: headers || (token ? { Authorization: `Bearer ${token}` } : {})
        };

        const response = await axios.post(`${API_URL}/${rout}`, params, config);

        return response.data;
    } catch (error) {
        console.error("Error while request:", error);
        return [];
    }
};