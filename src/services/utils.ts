import { useEffect } from "react";
import SparkMD5 from "spark-md5";

export const useLocalStorageListener = (key: string, callback: (data: any) => void) => {
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key) {
                callback(event.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key, callback]);
};

export const generateGUID = () => {
    // Helper function to generate a random four-character hexadecimal segment
    function s4(): string {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    // Combine four segments to form a GUID
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export const calculateFileMD5 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        // 使用 FileReader 读取文件内容  
        reader.readAsArrayBuffer(file);

        reader.onload = (e) => {
            const buffer = e.target?.result;
            if (buffer) {
                // 判断buffer是string还是ArrayBuffer
                if (buffer instanceof ArrayBuffer) {
                    const md5 = SparkMD5.ArrayBuffer.hash(buffer);
                    resolve(md5);
                } else {
                    // buffer 是 string
                    const md5 = SparkMD5.hash(buffer);
                    resolve(md5);
                }
            } else {
                reject('Failed to read file');
            }
        };

        reader.onerror = () => {
            reject('Failed to read file');
        };
    });
}