export async function updateUserContext(playerId, playerData) {
    console.log("Updating user context for playerId:", playerData);
    const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/updateuser', {
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