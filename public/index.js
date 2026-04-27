const API_HOST = 'http://127.0.0.1:3434';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const debug = document.getElementById('debug').checked;

    const statusContainer = document.getElementById('statusContainer');
    const resultsContainer = document.getElementById('resultsContainer');

    statusContainer.innerHTML = '<b>Status: Submitting...</b>';
    resultsContainer.innerHTML = '';

    try {
        const response = await fetch(`${API_HOST}/scrape_rewards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                debug
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit login request');
        }

        const { id, secret } = await response.json();

        pollResults(id, secret);
    } catch (error) {
        statusContainer.innerHTML = `<b>Error: ${error.message}</b>`;
    }
});

async function pollResults(id, secret) {
    const statusContainer = document.getElementById('statusContainer');
    const resultsContainer = document.getElementById('resultsContainer');

    const poll = async () => {
        try {
            const response = await fetch(
                `${API_HOST}/scrape_results?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch results');
            }

            const data = await response.json();

            statusContainer.innerHTML = `<b>Status: ${data.status}</b>`;

            if (data.status === 'COMPLETED' && data.results) {
                displayResults(data.results);
            } else if (data.status !== 'COMPLETED') {
                setTimeout(poll, 2000);
            }
        } catch (error) {
            statusContainer.innerHTML = `<b>Error: ${error.message}</b>`;
        }
    };

    poll();
}

function displayResults(results) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';

    for (const card of results) {
        const cardHeader = document.createElement('h2');
        cardHeader.textContent = card.cardName;
        resultsContainer.appendChild(cardHeader);

        for (const quarter of card.quarterlySummary) {
            const quarterHeader = document.createElement('h3');
            quarterHeader.textContent = quarter.quarter;
            resultsContainer.appendChild(quarterHeader);

            const table = document.createElement('table');
            table.border = '1';
            table.style.borderCollapse = 'collapse';

            const bonusTableHeader = document.createElement('tr');
            bonusTableHeader.innerHTML = '<th>Bonus Name</th><th>Points Earned</th><th>Points Remaining</th><th>Spend Remaining</th>';
            table.appendChild(bonusTableHeader);

            for (const [bonusName, bonusData] of Object.entries(quarter.bonusPoints || {})) {
                const bonusRow = document.createElement('tr');
                bonusRow.innerHTML = `
                    <td>${bonusName}</td>
                    <td>${bonusData.pointsEarned ?? ''}</td>
                    <td>${bonusData.pointsRemaining ?? ''}</td>
                    <td>${bonusData.spendRemaining ?? ''}</td>
                `;
                table.appendChild(bonusRow);
            }

            resultsContainer.appendChild(table);
        }
    }
}
