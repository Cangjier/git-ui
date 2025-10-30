import { forwardRef, useEffect, useRef } from "react";
import { FileDialog, IFileDialogRef } from "../../apps/FileDialog";
import { clientServices } from "../../services/clientServices";
import { historyAppActions } from "../../apps/ProjectsApp";


export const FilePage = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties;
}>((props, ref) => {
    const fileDialogRef = useRef<IFileDialogRef>(null);
    useEffect(() => {
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == "all" && message.data.action == historyAppActions.selectHistory) {
                let func = async () => {
                    let currentFolder = message.data.history.path;
                    fileDialogRef.current?.setFolder(currentFolder);
                };
                func();
            }
        });
        return () => {
            unregister();
        };
    }, []);
    return <FileDialog style={props.style} ref={fileDialogRef} />
});