import React, {useEffect, useRef, useState} from 'react';

const Resizable = ({children}) => {

    const ref = useRef();
    const [dragging, setDragging] = useState(false);
    const [size, setSize] = useState(0);
    const [resized, setResized] = useState(false);

    const [initialPos, setInitialPos] = useState(0)

    const calculateMovement = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setResized(true)
        const newSize = size + e.clientX - initialPos;
        if (newSize < 50) {
            return
        }
        setSize(newSize)
    }

    const clearDragging = () => {
        setDragging(false);
    }

    useEffect(() => {
        setSize(ref.current.getBoundingClientRect().width)
    }, [ref]);

    useEffect(() => {
        if (dragging) {
            document.addEventListener('mousemove', calculateMovement)
            document.addEventListener('mouseup', clearDragging)
            return () => {
                document.removeEventListener('mousemove', calculateMovement)
                document.removeEventListener('mouseup', clearDragging)
            }
        }
    }, [dragging]);

    return (
        <th draggable={false} ref={ref} className={"resizable"} onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setInitialPos(e.clientX)
            setDragging(true);
        }} style={{width: (resized ? size : undefined)}}>
            {children}
        </th>
    );
};

export default Resizable;