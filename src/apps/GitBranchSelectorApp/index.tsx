import { ConfigProvider, Input, Tree } from "antd";
import { forwardRef, useEffect, useRef, useState } from "react";
import { TableApp } from "../TableApp";
import { ColumnsType } from "antd/es/table";
import { hilightClass, hilightColor } from "../FileDialog";
import { useUpdate } from "../../natived";
import { localServices } from "../../services/localServices";
import { IGitBranch } from "../../services/interfaces";
interface GitBranchRecord extends IGitBranch {
    key: string;
}
export const GitBranchSelectorApp = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties,
    projectPath: string,
    onSelect: (branch: IGitBranch) => void,
    selectedBranchName?: string
}>((props, ref) => {
    const calculateTableData = (raw: IGitBranch[]) => {
        return raw.map(item => ({
            key: `${item.type}-${item.name}`,
            ...item
        }));
    }
    const [searchValue, setSearchValue] = useState<string>("");
    const [raw, updateRaw, rawRef] = useUpdate<IGitBranch[]>([]);
    const [tableData, updateTableData, tableDataRef] = useUpdate<GitBranchRecord[]>([]);
    const [selectedBranchNames, updateSelectedBranchNames, selectedBranchNamesRef] = useUpdate<string[]>(props.selectedBranchName ? [props.selectedBranchName] : []);
    const columns: ColumnsType<GitBranchRecord> = [
        {
            title: "Type",
            key: "type",
            render: (record: GitBranchRecord) => {
                return record.type;
            }
        },
        {
            title: "Name",
            key: "name",
            render: (record: GitBranchRecord) => {
                if (record.type == "local") {
                    if (record.ref) {
                        return `${record.name} -> ${record.ref.name}`;
                    }
                    else {
                        return record.name;
                    }
                }
                else {
                    return record.name;
                }
            }
        },
        {
            title: "Last Commit",
            key: "lastCommit",
            render: (record: GitBranchRecord) => {
                return record.lastCommit?.message.join("\n") ?? "";
            }
        }
    ]
    const initializeRef = useRef(async () => {
        let listResult = await localServices.git.listBranch(props.projectPath);
        updateRaw([...listResult.localBranches, ...listResult.remoteBranches]);
        updateTableData(calculateTableData(rawRef.current));
    });
    useEffect(() => {
        updateTableData(calculateTableData(raw));
    }, [searchValue]);
    useEffect(() => {
        initializeRef.current();
    }, []);
    const onSearch = (value: string) => {
        setSearchValue(value);
    };
    return <div ref={ref} style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        ...props.style
    }}>
        <Input.Search placeholder="Search" onSearch={onSearch} />
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
    </div>;
});