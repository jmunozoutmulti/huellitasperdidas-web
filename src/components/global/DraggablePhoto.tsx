'use client';

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';

interface DraggablePhotoProps {
    src: string;
    offsetY: number;
    onOffsetChange: (offsetY: number) => void;
}

export default function DraggablePhoto({ src, offsetY, onOffsetChange }: DraggablePhotoProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    // Al aparecer la foto, mostramos el hint solo (sin necesitar hover) un
    // par de segundos, para enseñar que es arrastrable — luego desaparece
    // y el comportamiento normal (aparece solo al pasar el mouse) sigue igual.
    const [showIntroHint, setShowIntroHint] = useState(true);

    const startYRef = useRef(0);
    const startOffsetRef = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setShowIntroHint(false), 2200);
        return () => clearTimeout(timer);
    }, []);

    const getMaxOffset = () => {
        const container = containerRef.current;
        const img = imgRef.current;
        if (!container || !img) return 0;
        const overflow = img.offsetHeight - container.offsetHeight;
        return Math.max(0, overflow / 2);
    };

    const handleStart = (clientY: number) => {
        setIsDragging(true);
        setShowIntroHint(false);
        startYRef.current = clientY;
        startOffsetRef.current = offsetY;
    };

    const handleMove = (clientY: number) => {
        if (!isDragging) return;
        const delta = clientY - startYRef.current;
        const maxOffset = getMaxOffset();
        let newOffset = startOffsetRef.current + delta;
        newOffset = Math.max(-maxOffset, Math.min(maxOffset, newOffset));
        onOffsetChange(newOffset);
    };

    const handleEnd = () => setIsDragging(false);

    const updateCursorPos = (clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setCursorPos({ x: clientX - rect.left, y: clientY - rect.top });
    };

    const showRealHint = isHovering && !showIntroHint;

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab', // ocultamos el cursor nativo, usamos el círculo en su lugar
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                handleEnd();
            }}
            onMouseMove={(e: MouseEvent) => {
                updateCursorPos(e.clientX, e.clientY);
                handleMove(e.clientY);
            }}
            onMouseDown={(e: MouseEvent) => handleStart(e.clientY)}
            onMouseUp={handleEnd}
            onTouchStart={(e: TouchEvent) => handleStart(e.touches[0].clientY)}
            onTouchMove={(e: TouchEvent) => handleMove(e.touches[0].clientY)}
            onTouchEnd={handleEnd}
        >
            <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={() => {
                    // Al cargar, asegura que arranque centrada (offsetY = 0 = centro real)
                    onOffsetChange(0);
                }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, calc(-50% + ${offsetY}px))`,
                    width: '100%',
                    height: 'auto',
                    minHeight: '100%',
                    maxWidth: 'none',
                    userSelect: 'none',
                }}
            />

            {showIntroHint && (
                <div className="drag-cursor-hint drag-cursor-hint-auto">
                    <span>ARRASTRA</span>
                </div>
            )}

            {showRealHint && (
                <div
                    className="drag-cursor-hint"
                    style={{
                        transform: `translate(${cursorPos.x - 40}px, ${cursorPos.y - 40}px)`,
                        opacity: 1,
                        transition: 'none',
                    }}
                >
                    <span>{isDragging ? 'MOVIENDO' : 'ARRASTRA'}</span>
                </div>
            )}
        </div>
    );
}