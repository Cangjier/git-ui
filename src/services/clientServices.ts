import axios from "axios";
import { ILocation } from "./interfaces";
import { generateGUID } from "./utils";
import { BaseServices } from "./baseServices";

export const ClientServices = () => {
    const base = BaseServices((window as any).webapplication.baseURL ?? "http://localhost:12332");
    const api = base.api;

    const openUrl = async (url: string, location?: ILocation, resident?: boolean) => {
        ///api/v1/app/open/
        if (location == undefined) {
            location = {
                x: 'center',
                y: 'center',
                width: '60%',
                height: '60%'
            };
        }
        let response = await api.post("/api/v1/app/open", {
            url: window.location.origin + url,
            location,
            resident
        });
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const home = async () => {
        console.log("home");
        let response = await api.post("/api/v1/app/home");
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const openwithdata = async (url: string, location?: ILocation, data?: any,resident?: boolean) => {
        ///api/v1/app/open/
        if (url.startsWith("/")) {
            url = window.location.origin + url;
        }
        if (location == undefined) {
            location = {
                x: 'center',
                y: 'center',
                width: '60%',
                height: '60%'
            };
        }
        let dataID = generateGUID();
        let response = await api.post("/api/v1/app/openwithdata", {
            url: `${url}?dataID=${dataID}`,
            location,
            dataID,
            data: data ?? {},
            resident
        });
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const mouseDownDrag = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/mousedowndrag", {
                id: webapplication.id
            });
        }
    }

    const close = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/close", {
                id: webapplication.id
            });
        }
    }

    const minimize = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/minimize", {
                id: webapplication.id
            });
        }
    }

    const show = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/show", {
                id: webapplication.id
            });
        }
    }

    const getDataByID = async (id: string) => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            let response = await api.post("/api/v1/app/getdatabyid", {
                id
            });
            if (response.status === 200) {
                if (response.data.success) {
                    return response.data.data;
                } else {
                    throw new Error(response.data.message);
                }
            }
        }
        else {
            return undefined;
        }
    }

    return {
        openUrl,
        home,
        openwithdata,
        mouseDownDrag,
        close,
        minimize,
        getDataByID,
        show,
        ...base
    }
}

export const clientServices = ClientServices();