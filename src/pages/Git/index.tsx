import { forwardRef } from "react";

export const Git = forwardRef<HTMLDivElement, {}>((props, ref) => {
    return <div ref={ref} style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: "#fff"
    }}>

    </div>
});