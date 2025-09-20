import { forwardRef, useEffect, useRef, useState } from "react";
import { ICommonFolder, IFolderItem } from "../../services/interfaces";
import { FileOutlined, FolderOutlined, UserOutlined } from "@ant-design/icons";
import DiskSvg from "../../svgs/Disk.svg?react";
import { localServices } from "../../services/localServices";
import { Input, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import { TableApp } from "../../apps/TableApp";
import { useUpdate } from "../../natived";



export const FileDialog = forwardRef<HTMLDivElement, {}>((props, ref) => {
    const [currentFolder, updateCurrentFolder] = useState<string>("");
    const [currentFolderEditing, updateCurrentFolderEditing] = useState<boolean>(false);
    const [currentFolderItems, updateCurrentFolderItems] = useState<IFolderItem[]>([]);
    const [commonFolders, updateCommonFolders] = useState<ICommonFolder[]>([]);
    const renderFolderIcon = (item: ICommonFolder) => {
        if (item.type === "disk") {
            return <DiskSvg />
        } else {
            return <FolderOutlined />
        }
    }
    const uiCommonFolders = commonFolders.map((item) => {
        return <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px"
        }} key={item.path}>
            {renderFolderIcon(item)}
            <div style={{
                fontSize: "14px",
                fontWeight: "bold"
            }}>{item.name}</div>
        </div>
    })
    const refreshCommonFolders = useRef(async () => {
        let result = await localServices.file.commonFolders();
        updateCommonFolders(result.items);
        const desktop = result.items.find(item => item.name == "Desktop");
        if (desktop && currentFolder == "") {
            updateCurrentFolder(desktop?.path ?? "");
        }
    });
    const refreshCurrentFolder = useRef(async () => {
        if (currentFolder == "") {
            return;
        }
        let result = await localServices.file.list(currentFolder);
        updateCurrentFolderItems(result);
    });
    const folderItemsColumns: ColumnsType<IFolderItem> = [
        {
            title: "Name",
            key: "name",
            render: (text: string, record: IFolderItem) => {
                return <div>{record.type == "file" ? <FileOutlined /> : <FolderOutlined />}{record.name}</div>
            }
        },
        {
            title: "Modify Time",
            key: "modifyTime",
            render: (text: string, record: IFolderItem) => {
                return <div>{record.modifyTime}</div>
            }
        }

    ]
    useEffect(() => {
        refreshCommonFolders.current();
        refreshCurrentFolder.current();
    }, []);
    useEffect(() => {
        refreshCurrentFolder.current();
    }, [currentFolder]);
    return <div
        ref={ref}
        style={{
            display: "flex",
            flexDirection: "row",
        }}
    >
        {/* 常用文件夹和磁盘目录 */}
        <div style={{
            display: "flex",
            flexDirection: "column",
        }}>
            {uiCommonFolders}
        </div>
        <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: 0
        }}>
            <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px"
            }}>
                <FolderOutlined />
                {currentFolderEditing ? <Input defaultValue={currentFolder} onBlur={(e) => {
                    updateCurrentFolder(e.target.value);
                    updateCurrentFolderEditing(false);
                }}
                    onPressEnter={(e) => {
                        updateCurrentFolder(e.currentTarget.value);
                        updateCurrentFolderEditing(false);
                    }}
                    autoFocus /> : <div style={{
                        cursor: "pointer"
                    }} onClick={() => {
                        updateCurrentFolderEditing(true);
                    }}>{currentFolder}</div>}
            </div>
            <TableApp style={{
                flex: 1,
                height: 0
            }} columns={folderItemsColumns} dataSource={currentFolderItems} />
        </div>
    </div>
})