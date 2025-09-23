import { forwardRef, useEffect, useRef, useState } from "react";
import { ICommonFolder, IFolderItem } from "../../services/interfaces";
import { ArrowUpOutlined, DesktopOutlined, FileOutlined, FolderOutlined, UserOutlined } from "@ant-design/icons";
import DiskSvg from "../../svgs/Disk.svg?react";
import { localServices } from "../../services/localServices";
import { Collapse, ConfigProvider, Dropdown, Input, message, Splitter, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import { TableApp } from "../../apps/TableApp";
import { InjectClass, useUpdate } from "../../natived";
import { clientServices } from "../../services/clientServices";
// 淡蓝色
const hilightColor = "#c6e0ff";
const hilightClass = InjectClass(`
    background-color: ${hilightColor};
`);
export const FileDialog = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties
}>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [currentFolder, updateCurrentFolder, currentFolderRef] = useUpdate<string>("");
    const [currentFolderEditing, updateCurrentFolderEditing] = useState<boolean>(false);
    const [currentFolderItems, updateCurrentFolderItems] = useState<IFolderItem[]>([]);
    const [commonFolders, updateCommonFolders] = useState<ICommonFolder[]>([]);
    const [hilightRows, updateHilightRows] = useState<string[]>([]);
    const renderFolderIcon = (item: ICommonFolder) => {
        if (item.type === "disk") {
            return <DiskSvg />
        } else {
            return <FolderOutlined />
        }
    }
    const uiCommonFolders = <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px"
    }}>
        {commonFolders.map((item) => {
            return <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer"
            }} key={item.path} onClick={async () => {
                updateCurrentFolder(item.path);
                await refreshCurrentFolder.current();
            }}>
                {renderFolderIcon(item)}
                <div style={{
                    fontSize: "14px"
                }}>{item.name}</div>
            </div>
        })}
    </div>
    const folderSidebar = <Collapse size="small" bordered={false} items={[{
        key: "common-folders",
        label: <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "5px" }}>
            <DesktopOutlined />
            This PC
        </div>,
        children: uiCommonFolders
    }]} defaultActiveKey={['common-folders']} />;
    const refreshCommonFolders = useRef(async () => {
        let result = await localServices.file.commonFolders();
        updateCommonFolders(result.items);
        const desktop = result.items.find(item => item.name == "Desktop");
        if (desktop && currentFolderRef.current == "") {
            updateCurrentFolder(desktop?.path ?? "");
            await refreshCurrentFolder.current();
        }
    });
    const refreshCurrentFolder = useRef(async () => {
        if (currentFolderRef.current == "") {
            return;
        }
        let result = await localServices.file.list(currentFolderRef.current);
        updateCurrentFolderItems(result);
    });
    const folderItemsColumns: ColumnsType<IFolderItem> = [
        {
            title: "Name",
            key: "name",
            render: (text: string, record: IFolderItem) => {
                return <Dropdown menu={{
                    items: [
                        {
                            label: record.type == "directory" ? "Open in Explorer" : "Reveal in Explorer",
                            key: "open",
                            onClick: async () => {
                                if (record.type == "directory") {
                                    await localServices.file.openDirectoryInExplorer(record.path);
                                }
                                else {
                                    await localServices.file.revealFileInExplorer(record.path);
                                }
                            }
                        },
                        {
                            label: "Copy Path",
                            key: "copy-path",
                            onClick: () => {
                                clientServices.copy(record.path);
                            }
                        }
                    ]
                }} trigger={["contextMenu"]}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "5px",
                        cursor: "pointer"
                    }} onDoubleClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (record.type == "directory") {
                            updateCurrentFolder(record.path);
                            await refreshCurrentFolder.current();
                        }
                    }}>
                        {record.type == "file" ? <FileOutlined /> : <FolderOutlined />}{record.name}
                    </div>
                </Dropdown>
            }
        },
        {
            title: "Modify Time",
            key: "modifyTime",
            width: "12em",
            render: (text: string, record: IFolderItem) => {
                return <div>{record.modifyTime}</div>
            }
        },
        {
            title: "",
            key: "other",
            width: "0"
        }

    ]
    const currentFolderInput = <Input style={{
        flex: 1,
        width: 0
    }} defaultValue={currentFolder} onBlur={(e) => {
        onCurrentFolderChangeByInput(e.currentTarget.value);
    }}
        onPressEnter={(e) => {
            onCurrentFolderChangeByInput(e.currentTarget.value);
        }}
        autoFocus />
    useEffect(() => {
        refreshCommonFolders.current();
        refreshCurrentFolder.current();
    }, []);
    const onCurrentFolderChangeByInput = async (path: string) => {
        if (await localServices.file.directoryExists(path)) {
            updateCurrentFolder(path);
            updateCurrentFolderEditing(false);
        } else {
            messageApi.error("Directory not found");
        }
    }
    return <div
        ref={ref}
        style={{
            display: "flex",
            flexDirection: "column",
            ...props.style
        }}
    >
        {messageContextHolder}
        {/* 常用文件夹和磁盘目录 */}
        <Splitter>
            <Splitter.Panel defaultSize={140} min={140}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%"
                }}>
                    {folderSidebar}
                </div>
            </Splitter.Panel>
            <Splitter.Panel>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%"
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "10px",
                        height: "32px",
                        padding: "0 0 0 8px"
                    }}>
                        <ArrowUpOutlined style={{ cursor: "pointer" }} onClick={async () => {
                            const parentDirectory = await localServices.file.getDirectoryName(currentFolder);
                            updateCurrentFolder(parentDirectory);
                            await refreshCurrentFolder.current();
                        }} />
                        <FolderOutlined style={{ cursor: "pointer" }} onClick={async () => {
                            await localServices.file.openDirectoryInExplorer(currentFolder);
                        }} />
                        {currentFolderEditing ? currentFolderInput : <div style={{
                            cursor: "pointer",
                            flex: 1,
                            width: 0,
                            fontSize: "14px"
                        }} onClick={() => {
                            updateCurrentFolderEditing(true);
                        }}>{currentFolder}</div>}
                    </div>
                    <ConfigProvider theme={{
                        components: {
                            Table: {
                                rowHoverBg: hilightColor
                            }
                        }
                    }}>
                        <TableApp style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            height: 0
                        }}
                            size="small"
                            columns={folderItemsColumns}
                            dataSource={currentFolderItems}
                            onRow={(record) => {
                                return {
                                    onMouseDown: (e) => {
                                        // 抑制其他行为，如问题连选
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // 支持 ctrl 和 shift 键
                                        if (e.ctrlKey && e.shiftKey == false) {
                                            updateHilightRows(oldKeys => {
                                                if (oldKeys.includes(record.path)) {
                                                    return oldKeys.filter(key => key != record.path);
                                                }
                                                return [...oldKeys, record.path];
                                            });
                                        } else if (e.shiftKey && e.ctrlKey == false) {
                                            const allSelectedKeys = [...hilightRows];
                                            if (allSelectedKeys.includes(record.path) == false) {
                                                allSelectedKeys.push(record.path);
                                            }
                                            let indices: number[] = allSelectedKeys.map(key => currentFolderItems.findIndex(item => item.path == key));
                                            indices.sort((a, b) => a - b);
                                            const newHilightRows: string[] = [];
                                            for (let i = indices[0]; i <= indices[indices.length - 1]; i++) {
                                                newHilightRows.push(currentFolderItems[i].path);
                                            }
                                            updateHilightRows(newHilightRows);

                                        } else {
                                            updateHilightRows([record.path]);
                                        }
                                    }
                                }
                            }}
                            rowClassName={(record) => {
                                return hilightRows.includes(record.path) ? hilightClass : "";
                            }}
                        />
                    </ConfigProvider>

                </div>
            </Splitter.Panel>
        </Splitter>
    </div>
})