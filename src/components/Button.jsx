// Button.jsx - PC 端响应式优化版本
import React, { useState, useEffect } from 'react';

const Button = ({
    onClick,
    animation = 'fadeIn 0.5s ease-in-out forwards',
    children
}) => {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const baseStyle = {
        marginTop: isDesktop ? '50px' : '40px',
        padding: isDesktop ? '20px 50px' : '15px 30px',
        fontSize: isDesktop ? '1.5rem' : '1.2rem',
        fontFamily: 'monospace',
        background: '#8B4513',
        color: '#fff',
        border: isDesktop ? '4px solid #654321' : '3px solid #654321',
        borderRadius: '0',
        cursor: 'pointer',
        boxShadow: isPressed 
            ? '0px 0px 0px #2F1B14' 
            : isDesktop ? '5px 5px 0px #2F1B14' : '3px 3px 0px #2F1B14',
        textShadow: '1px 1px 0px #000',
        opacity: 0,
        zIndex: 1500,
        transition: 'all 0.2s ease',
        animation: animation,
        transform: isPressed 
            ? 'translate(5px, 5px)' 
            : isHovered && isDesktop 
                ? 'translate(-2px, -2px)' 
                : 'translate(0px, 0px)',
        fontWeight: 'bold',
        letterSpacing: isDesktop ? '0.05em' : 'normal',
        minWidth: isDesktop ? '220px' : '180px',
    };

    const handlePressStart = (e) => {
        e.preventDefault();
        setIsPressed(true);
    };

    const handlePressEnd = (e) => {
        e.preventDefault();
        setIsPressed(false);
    };

    const handleMouseEnter = () => {
        if (isDesktop) {
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsPressed(false);
    };

    return (
        <button
            onClick={onClick}
            style={baseStyle}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
        >
            {children}
        </button>
    );
};

export default Button;