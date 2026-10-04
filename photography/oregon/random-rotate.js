document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.random-rotate').forEach(div => {
            const randomAngle = (Math.random() - 0.5) * 12.5; 
            div.style.setProperty('transform', `rotate(${randomAngle}deg)`);
            console.log("Rotated")
        }
    );
    
});
