import { forwardRef } from "react";

export const Swig = forwardRef<HTMLDivElement, {}>((props, ref) => {
    return <div ref={ref} style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: "#fff"
    }}>

    </div>
});