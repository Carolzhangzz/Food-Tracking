export async function updateUserContext(playerId, playerData) {
    console.log("Updating user context for playerId:", playerData);
    const response = await fetch('http://127.0.0.1:8000/api/updateuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerId: playerId,
            playerData: {
                ...playerData,
            },
        }),
    });
    const result = await response.json();
    return result;
}