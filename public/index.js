const API_HOST = 'http://127.0.0.1:3434';

function setStatus(message) {
    document.getElementById('statusText').innerHTML = `<b>Status: ${message}</b>`;
}

let spinnerInterval = null;
const spinnerFrames = ['|', '/', '-', '\\'];
let spinnerIndex = 0;

function startSpinner() {
    if (spinnerInterval) return;
    document.getElementById('spinner').innerHTML = ' ';
    spinnerInterval = setInterval(() => {
        document.getElementById('spinner').innerHTML = ' ' + spinnerFrames[spinnerIndex];
        spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 100);
}

function stopSpinner() {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    document.getElementById('spinner').innerHTML = '';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const debug = document.getElementById('debug').checked;

    const jobIdContainer = document.getElementById('jobIdContainer');
    const resultsContainer = document.getElementById('resultsContainer');

    jobIdContainer.innerHTML = '';
    setStatus('Submitting...');
    stopSpinner();
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

        jobIdContainer.innerHTML = `<b>Job ID: ${id}</b>`;

        pollResults(id, secret);
    } catch (error) {
        setStatus(`Error: ${error.message}`);
        stopSpinner();
    }
});

async function pollResults(id, secret) {
    const resultsContainer = document.getElementById('resultsContainer');

    let data;
    const poll = async () => {
        try {
            const response = await fetch(
                `${API_HOST}/scrape_results?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch results');
            }

            data = await response.json();

            if (data.status === 'AUTHENTICATING' || data.status === 'RETRIEVING_DATA') {
                setStatus(data.status);
                startSpinner();
                setTimeout(poll, 2000);
            } else if (data.status === 'COMPLETED' && data.results) {
                stopSpinner();
                setStatus(data.status);
                displayResults(data.results);
            } else {
                stopSpinner();
                setStatus(data.status);
            }
        } catch (error) {
            stopSpinner();
            setStatus(`Error: ${error.message}`);
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
                const spendRemaining = bonusData.spendRemaining != null
                    ? `$${Number(bonusData.spendRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '';
                bonusRow.innerHTML = `
                    <td>${bonusName}</td>
                    <td>${bonusData.pointsEarned ?? ''}</td>
                    <td>${bonusData.pointsRemaining ?? ''}</td>
                    <td>${spendRemaining}</td>
                `;
                table.appendChild(bonusRow);
            }

            resultsContainer.appendChild(table);
        }
    }
}
