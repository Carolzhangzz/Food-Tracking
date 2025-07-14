import React from 'react';

const defaultStyle = {
    marginTop: '40px',
    padding: '15px 30px',
    fontSize: '1.2rem',
    fontFamily: 'monospace',
    background: '#8B4513',
    color: '#fff',
    border: '3px solid #654321',
    borderRadius: '0',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #2F1B14',
    textShadow: '1px 1px 0px #000',
    opacity: 0,
    transition: 'none'
};

const Button = ({
    onClick,
    animation = 'fadeIn 0.5s ease-in-out forwards',
    children
}) => {
    const style = {
        ...defaultStyle,
        animation
    };
    const handlePressStart = (e) => {
        // Prevent mouse/touch event conflicts
        e.target.style.transform = 'translate(3px, 3px)';
        e.target.style.boxShadow = '0px 0px 0px #2F1B14';
    };

    const handlePressEnd = (e) => {
        e.target.style.transform = 'translate(0px, 0px)';
        e.target.style.boxShadow = '3px 3px 0px #2F1B14';
    };

    return (
        <button
            onClick={onClick}
            style={style}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
        >
            {children}
        </button>
    );
};

export default Button;