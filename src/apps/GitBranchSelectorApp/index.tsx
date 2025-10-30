import { Button, ConfigProvider, Input, message, Space, Spin, Tooltip, Tree } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { TableApp } from "../TableApp";
import { ColumnsType } from "antd/es/table";
import { hilightClass, hilightColor } from "../FileDialog";
import { useUpdate } from "../../natived";
import { localServices } from "../../services/localServices";
import { IGitBranch } from "../../services/interfaces";
import RegexIcon from "../../svgs/Regex.svg?react";
import { ArrowDownOutlined } from "@ant-design/icons";
interface GitBranchRecord extends IGitBranch {
    key: string;
}
export const GitBranchSelectorApp = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties,
    projectPath: string,
    onSelect: (branch: IGitBranch) => void,
    selectedBranchName?: string
}>((props, ref) => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const calculateTableData = (raw: IGitBranch[]) => {
        return raw.map(item => ({
            key: `${item.type}-${item.name}`,
            ...item
        }));
    }
    const [searchValue, setSearchValue, searchValueRef] = useUpdate<string>("");
    const [raw, updateRaw, rawRef] = useUpdate<IGitBranch[]>([]);
    const [tableData, updateTableData, tableDataRef] = useUpdate<GitBranchRecord[]>([]);
    const [selectedBranchNames, updateSelectedBranchNames, selectedBranchNamesRef] = useUpdate<string[]>(props.selectedBranchName ? [props.selectedBranchName] : []);
    const [useRegex, updateUseRegex, useRegexRef] = useUpdate<boolean>(false);
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number,
        message?: string,
        percent?: number
    }>({
        loading: 0,
        message: undefined,
        percent: undefined
    });
    const columns: ColumnsType<GitBranchRecord> = [
        {
            title: "Type",
            key: "type",
            width: "5em",
            render: (record: GitBranchRecord) => {
                return record.type;
            }
        },
        {
            title: "Name",
            key: "name",
            width:"20em",
            render: (record: GitBranchRecord) => {
                if (record.type == "local") {
                    if (record.ref && record.ref.name) {
                        return <div style={{ cursor: "pointer" }}>{`${record.name} -> ${record.ref.name}`}</div>;
                    }
                    else {
                        return <div style={{ cursor: "pointer" }}>{record.name}</div>;
                    }
                }
                else {
                    return <div style={{ cursor: "pointer" }}>{record.name}</div>;
                }
            }
        },
        {
            title: "Last Commit",
            key: "lastCommit",
            ellipsis: true,
            width: "40em",
            render: (record: GitBranchRecord) => {
                return record.lastCommit?.message.join("\n") ?? "";
            }
        },
        {
            title: "",
            key: "other"
        }
    ];
    const Try = async (options: {
        useLoading?: boolean
    }, callback: () => Promise<void>) => {
        if (options.useLoading) {
            updateLoading(old => ({ ...old, loading: old.loading + 1 }));
        }
        try {
            await callback();
        } catch (error) {
            let isInnerError = false;
            if (options.useLoading && loadingRef.current.loading > 1) {
                isInnerError = true;
            }
            if (isInnerError) {
                throw error;
            }
            else {
                if (error instanceof Error) {
                    messageApi.error(error.message);
                } else {
                    messageApi.error("Unknown error");
                }
            }
        } finally {
            if (options.useLoading) {
                updateLoading(old => ({ ...old, loading: old.loading - 1 }));
            }
        }
    };
    const filterRef = useRef(() => {
        if (useRegexRef.current) {
            if (searchValueRef.current.trim() == "") {
                updateTableData(calculateTableData(rawRef.current));
            }
            else {
                updateTableData(calculateTableData(rawRef.current.filter(item => item.name.match(new RegExp(searchValueRef.current.trim())))));
            }
        }
        else {
            updateTableData(calculateTableData(rawRef.current.filter(item => item.name.includes(searchValueRef.current.trim()))));
        }
    });
    const initializeRef = useRef(async () => {
        await Try({ useLoading: true }, async () => {
            let listResult = await localServices.git.listBranch(props.projectPath);
            updateRaw([...listResult.localBranches, ...listResult.remoteBranches]);
            filterRef.current();
        });
    });

    useEffect(() => {
        filterRef.current();
    }, [searchValue]);
    useEffect(() => {
        initializeRef.current();
    }, []);
    const onSearch = (value: string) => {
        setSearchValue(value);
    };
    const onGitFetch = async () => {
        await Try({ useLoading: true }, async () => {
            await localServices.git.fetch(props.projectPath, {
                prune: true
            });
            await initializeRef.current();
        });
    };
    return <div ref={ref} style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        ...props.style
    }}>
        {messageContextHolder}
        <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: "10px"
        }}>
            <Space.Compact style={{ width: '100%' }}>
                <Input.Search placeholder="Search" onSearch={onSearch} />
                <Tooltip title="Use regex to search">
                    <Button icon={<RegexIcon fill={useRegex ? "blue" : "#ddd"} />} onClick={() => updateUseRegex(!useRegex)} />
                </Tooltip>
                <Tooltip title="git fetch --prune">
                    <Button icon={<ArrowDownOutlined />} onClick={onGitFetch} />
                </Tooltip>
            </Space.Compact>

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
                    columns={columns}
                    dataSource={tableData}
                    onRow={(record: GitBranchRecord) => {
                        return {
                            onMouseDown: (e) => {
                                // 抑制其他行为，如问题连选
                                e.preventDefault();
                                e.stopPropagation();
                                updateSelectedBranchNames([record.key]);
                                props.onSelect(record);
                            }
                        }
                    }}
                    rowClassName={(record) => {
                        return selectedBranchNames.includes(record.key) ? hilightClass : "";
                    }}
                />
            </ConfigProvider>
        </div>
        <div style={{
            position: "absolute",
            display: loading.loading > 0 ? "flex" : "none",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
        }}>
            <Spin tip={loading.message} percent={loading.percent} />
        </div>

    </div>;
});