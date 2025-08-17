// Landing Page Logic (unchanged)
document.getElementById('loginBtn')?.addEventListener('click', () => showForm('login'));
document.getElementById('signupBtn')?.addEventListener('click', () => showForm('signup'));

document.getElementById('authSubmit')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const action = document.getElementById('action').value;

    anime({
        targets: '#submitBtn',
        scale: [1, 0.9, 1],
        rotate: ['0deg', '5deg', '0deg'],
        duration: 400,
        easing: 'easeInOutQuad'
    });

    fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, action })
    }).then(response => response.json()).then(data => {
        const errorMessage = document.getElementById('errorMessage');
        if (data.success) {
            if (action === 'signup') {
                errorMessage.textContent = data.message;
                errorMessage.classList.remove('hidden', 'error');
                errorMessage.classList.add('success');
                animateErrorMessage();
                setTimeout(() => {
                    errorMessage.classList.add('hidden');
                    document.getElementById('authForm').classList.add('hidden');
                }, 2000);
            } else if (action === 'login') {
                window.location.href = data.redirect;
            }
        } else {
            errorMessage.textContent = data.message;
            errorMessage.classList.remove('hidden', 'success');
            errorMessage.classList.add('error');
            animateErrorMessage();
            setTimeout(() => errorMessage.classList.add('hidden'), 3000);
        }
    }).catch(err => console.error('Error:', err));
});

function showForm(type) {
    const form = document.getElementById('authForm');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('submitBtn').textContent = type === 'login' ? 'Login' : 'Signup';
        document.getElementById('action').value = type;
        anime({
            targets: '#authForm',
            opacity: [0, 1],
            translateY: [30, 0],
            scale: [0.95, 1],
            duration: 600,
            easing: 'easeOutExpo'
        });
    }
}

// Dashboard Logic
let isAnimating = false;

document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const sectionMap = {
            'budgetBtn': 'budgetSection',
            'expensesBtn': 'expensesSection',
            'analysisBtn': 'analysisSection',
            'goalsBtn': 'goalsSection',
            'savingsBtn': 'savingsSection'
        };
        const sectionId = sectionMap[btn.id];
        if (sectionId && !isAnimating) {
            showSection(sectionId);
            if (btn.id === 'analysisBtn') drawCharts();
        }
    });
});

document.getElementById('monthlyPlanningBtn')?.addEventListener('click', () => togglePlanning('monthlyPlanning'));
document.getElementById('yearlyPlanningBtn')?.addEventListener('click', () => togglePlanning('yearlyPlanning'));

document.getElementById('increaseBudgetBtn')?.addEventListener('click', () => {
    const amount = document.getElementById('budgetIncrease').value;
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    fetch('/increase_budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
    }).then(response => {
        if (response.ok) {
            budget += parseFloat(amount);
            updateBudgetDisplays();
            document.getElementById('budgetIncrease').value = '';
            animateValueUpdate('#remainingBudget', budget - parseFloat(amount), budget);
        } else {
            alert('Failed to increase budget.');
        }
    }).catch(err => console.error('Error:', err));
});

document.getElementById('addExpenseBtn')?.addEventListener('click', () => {
    const amount = document.getElementById('expenseAmount').value;
    const reason = document.getElementById('expenseReason').value;
    if (!amount || amount <= 0 || !reason) {
        alert('Please enter a valid amount and reason.');
        return;
    }
    fetch('/add_expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), reason })
    }).then(response => response.json()).then(data => {
        if (data.success) {
            budget = data.budget;
            expenses.push({ reason, amount: parseFloat(amount) });
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.dataset.amount = amount;
            li.textContent = `${reason}: ₹${amount}`;
            document.getElementById('expenseList').appendChild(li);
            animateNewExpense(li);
            updateBudgetDisplays();
            if (budget <= 0.2 * initialBudget) {
                alert('Warning: You’ve used 80% or more of your budget!');
            }
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expenseReason').value = '';
            if (!document.getElementById('analysisSection').classList.contains('hidden')) drawCharts();
        } else {
            alert('Failed to add expense.');
        }
    }).catch(err => console.error('Error:', err));
});

document.getElementById('clearDataBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all financial data? This cannot be undone.')) {
        fetch('/clear_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(response => {
            if (response.ok) {
                budget = 0;
                expenses = [];
                document.getElementById('remainingBudget').textContent = '0.00';
                document.getElementById('expenseList').innerHTML = '<li class="expense-item" data-amount="0">No expenses yet.</li>';
                updateBudgetDisplays();
                if (!document.getElementById('analysisSection').classList.contains('hidden')) drawCharts();
            } else {
                alert('Failed to clear data.');
            }
        }).catch(err => console.error('Error:', err));
    }
});

document.getElementById('logoutForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        fetch('/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(response => {
            if (response.ok) {
                window.location.href = '/';
            } else {
                alert('Failed to logout. Please try again.');
            }
        }).catch(err => console.error('Logout Error:', err));
    }
});

// Savings Account Logic
document.getElementById('addSavingsBtn')?.addEventListener('click', () => {
    const amount = document.getElementById('savingsAmount').value;
    const source = document.getElementById('savingsSource').value;
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }
    if (source === 'main' && parseFloat(amount) > budget) {
        alert('Amount exceeds remaining budget!');
        return;
    }
    fetch('/add_savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), source })
    }).then(response => response.json()).then(data => {
        if (data.success) {
            savings_balance = data.savings_balance;
            document.getElementById('savingsBalance').textContent = savings_balance.toFixed(2);
            document.getElementById('analysisSavingsBalance').textContent = savings_balance.toFixed(2);
            if (source === 'main') {
                budget = data.budget;
                updateBudgetDisplays();
            }
            document.getElementById('savingsAmount').value = '';
            if (!document.getElementById('analysisSection').classList.contains('hidden')) drawCharts();
        } else {
            alert('Failed to add to savings.');
        }
    }).catch(err => console.error('Error:', err));
});

// Goal Setting Logic
document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    const goalName = document.getElementById('goalName').value;
    const targetAmount = document.getElementById('goalTarget').value;
    if (!goalName || !targetAmount || targetAmount <= 0) {
        alert('Please enter a valid goal name and target amount.');
        return;
    }
    fetch('/add_goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_name: goalName, target_amount: parseFloat(targetAmount) })
    }).then(response => response.json()).then(data => {
        if (data.success) {
            const newGoal = { goal_name: goalName, target_amount: parseFloat(targetAmount), current_amount: 0 };
            goals.push(newGoal);
            const li = document.createElement('li');
            li.className = 'goal-item';
            li.dataset.goalName = goalName;
            li.innerHTML = `
                <div>${goalName}: ₹0 / ₹${targetAmount}</div>
                <progress value="0" max="${targetAmount}"></progress>
                <div class="input-group">
                    <input type="number" class="goal-contribution" placeholder="Contribute" min="0">
                    <button class="btn btn-action contribute-btn"><i class="fas fa-plus"></i> Add</button>
                    <button class="btn btn-clear delete-goal-btn"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
                <div class="goal-analysis">
                    <p>Remaining: ₹<span class="remaining-amount">${targetAmount}</span></p>
                    <input type="number" class="goal-timeframe" placeholder="Days to Achieve" min="1">
                    <p>Savings Needed: Daily ₹<span class="daily-savings">0</span> | Weekly ₹<span class="weekly-savings">0</span> | Monthly ₹<span class="monthly-savings">0</span></p>
                </div>`;
            document.getElementById('goalList').appendChild(li);
            animateNewGoal(li);
            document.getElementById('goalName').value = '';
            document.getElementById('goalTarget').value = '';
            attachGoalListeners(li);
            updateGoalsAnalysis();
        } else {
            alert('Failed to add goal.');
        }
    }).catch(err => console.error('Error:', err));
});

function attachGoalListeners(goalItem) {
    const contributeBtn = goalItem.querySelector('.contribute-btn');
    contributeBtn.addEventListener('click', (e) => {
        const li = e.target.closest('.goal-item');
        const goalName = li.dataset.goalName;
        const amount = parseFloat(li.querySelector('.goal-contribution').value);
        if (!amount || amount <= 0) {
            alert('Please enter a valid contribution amount.');
            return;
        }
        if (amount > budget) {
            alert('Contribution exceeds remaining budget!');
            return;
        }
        fetch('/update_goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_name: goalName, amount })
        }).then(response => response.json()).then(data => {
            if (data.success) {
                const goal = goals.find(g => g.goal_name === goalName);
                const oldAmount = goal.current_amount;
                goal.current_amount += amount;
                budget = data.budget;
                savings_balance = data.savings_balance;
                updateBudgetDisplays();
                document.getElementById('savingsBalance').textContent = savings_balance.toFixed(2);
                document.getElementById('analysisSavingsBalance').textContent = savings_balance.toFixed(2);
                li.querySelector('progress').value = goal.current_amount;
                li.querySelector('progress').max = goal.target_amount;
                li.querySelector('div:first-child').textContent = `${goalName}: ₹${goal.current_amount} / ₹${goal.target_amount}`;
                animateValueUpdate(li.querySelector('progress'), oldAmount, goal.current_amount);
                li.querySelector('.goal-contribution').value = '';
                updateGoalAnalysis(li, goal);
                updateGoalsAnalysis();
                if (!document.getElementById('analysisSection').classList.contains('hidden')) drawCharts();
                if (goal.current_amount >= goal.target_amount) {
                    alert(`Congratulations! You've achieved your goal: ${goalName}`);
                }
            } else {
                alert('Failed to update goal.');
            }
        }).catch(err => console.error('Error:', err));
    });

    const deleteBtn = goalItem.querySelector('.delete-goal-btn');
    deleteBtn.addEventListener('click', (e) => {
        const li = e.target.closest('.goal-item');
        const goalName = li.dataset.goalName;
        if (confirm(`Are you sure you want to delete the goal: ${goalName}?`)) {
            fetch('/delete_goal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal_name: goalName })
            }).then(response => response.json()).then(data => {
                if (data.success) {
                    goals = goals.filter(g => g.goal_name !== goalName);
                    budget = data.budget;
                    savings_balance = data.savings_balance;
                    updateBudgetDisplays();
                    document.getElementById('savingsBalance').textContent = savings_balance.toFixed(2);
                    document.getElementById('analysisSavingsBalance').textContent = savings_balance.toFixed(2);
                    li.remove();
                    if (document.querySelectorAll('#goalList .goal-item').length === 0) {
                        document.getElementById('goalList').innerHTML = '<li class="goal-item" data-goal-name="none">No goals set yet.</li>';
                    }
                    updateGoalsAnalysis();
                    if (!document.getElementById('analysisSection').classList.contains('hidden')) drawCharts();
                } else {
                    alert('Failed to delete goal.');
                }
            }).catch(err => console.error('Error:', err));
        }
    });

    const timeframeInput = goalItem.querySelector('.goal-timeframe');
    timeframeInput.addEventListener('input', () => {
        const goal = goals.find(g => g.goal_name === goalItem.dataset.goalName);
        updateGoalAnalysis(goalItem, goal);
    });
}

function updateGoalAnalysis(goalItem, goal) {
    const remaining = goal.target_amount - goal.current_amount;
    goalItem.querySelector('.remaining-amount').textContent = remaining.toFixed(2);
    
    const timeframe = parseFloat(goalItem.querySelector('.goal-timeframe').value) || 0;
    if (timeframe > 0) {
        const dailySavings = remaining / timeframe;
        const weeklySavings = remaining / (timeframe / 7);
        const monthlySavings = remaining / (timeframe / 30);
        goalItem.querySelector('.daily-savings').textContent = dailySavings.toFixed(2);
        goalItem.querySelector('.weekly-savings').textContent = weeklySavings.toFixed(2);
        goalItem.querySelector('.monthly-savings').textContent = monthlySavings.toFixed(2);
    } else {
        goalItem.querySelector('.daily-savings').textContent = '0';
        goalItem.querySelector('.weekly-savings').textContent = '0';
        goalItem.querySelector('.monthly-savings').textContent = '0';
    }
}

function attachGoalListenersToAll() {
    document.querySelectorAll('#goalList .goal-item').forEach(goalItem => {
        if (!goalItem.dataset.listenersAdded) {
            attachGoalListeners(goalItem);
            goalItem.dataset.listenersAdded = 'true';
        }
    });
}

function updateGoalsAnalysis() {
    const goalsList = document.getElementById('goalsAnalysisList');
    goalsList.innerHTML = '';
    if (goals.length > 0) {
        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'goal-item';
            li.dataset.goalName = goal.goal_name;
            li.innerHTML = `${goal.goal_name}: ₹${goal.current_amount} / ₹${goal.target_amount}
                            <progress value="${goal.current_amount}" max="${goal.target_amount}"></progress>`;
            goalsList.appendChild(li);
        });
    } else {
        goalsList.innerHTML = '<li class="goal-item" data-goal-name="none">No goals set yet.</li>';
    }
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section || isAnimating) return;

    isAnimating = true;

    document.querySelectorAll('.section').forEach(otherSection => {
        if (!otherSection.classList.contains('hidden') && otherSection !== section) {
            anime({
                targets: otherSection,
                opacity: [1, 0],
                translateX: [0, -30],
                duration: 300,
                easing: 'easeInQuad',
                complete: () => {
                    otherSection.classList.add('hidden');
                }
            });
        }
    });

    section.classList.remove('hidden');
    anime({
        targets: section,
        opacity: [0, 1],
        translateX: [-30, 0],
        scale: [0.98, 1],
        duration: 500,
        easing: 'easeOutExpo',
        complete: () => {
            isAnimating = false;
            updateBudgetDisplays();
        }
    });
}

function togglePlanning(planningId) {
    const monthly = document.getElementById('monthlyPlanning');
    const yearly = document.getElementById('yearlyPlanning');
    const target = document.getElementById(planningId);

    [monthly, yearly].forEach(section => {
        if (section !== target && !section.classList.contains('hidden')) {
            anime({
                targets: section,
                opacity: [1, 0],
                translateY: [0, 10],
                duration: 300,
                easing: 'easeInQuad',
                complete: () => section.classList.add('hidden')
            });
        }
    });

    if (target.classList.contains('hidden')) {
        target.classList.remove('hidden');
        anime({
            targets: target,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 500,
            easing: 'easeOutExpo'
        });
    }
    updateBudgetDisplays();
}

function updateBudgetDisplays() {
    const remainingBudgetElements = document.querySelectorAll('#remainingBudget, #analysisRemainingBudget');
    remainingBudgetElements.forEach(el => el.textContent = budget.toFixed(2));

    const daysInMonth = 30;
    const dailyBudgetAnalysis = budget / daysInMonth;
    const weeklyBudgetAnalysis = budget / (daysInMonth / 7);
    const monthlyBudgetAnalysis = budget;
    document.querySelectorAll('#analysisDailyBudget').forEach(el => el.textContent = dailyBudgetAnalysis.toFixed(2));
    document.querySelectorAll('#analysisWeeklyBudget').forEach(el => el.textContent = weeklyBudgetAnalysis.toFixed(2));
    document.querySelectorAll('#analysisMonthlyBudget').forEach(el => el.textContent = monthlyBudgetAnalysis.toFixed(2));

    const dailyBudget = budget / daysInMonth;
    const weeklyBudgetMonthly = budget / (daysInMonth / 7);
    document.getElementById('dailyBudget').textContent = dailyBudget.toFixed(2);
    document.getElementById('weeklyBudgetMonthly').textContent = weeklyBudgetMonthly.toFixed(2);

    const daysInYear = 365;
    const weeklyBudgetYearly = budget / (daysInYear / 7);
    const monthlyBudgetYearly = budget / (daysInYear / 12);
    document.getElementById('weeklyBudgetYearly').textContent = weeklyBudgetYearly.toFixed(2);
    document.getElementById('monthlyBudgetYearly').textContent = monthlyBudgetYearly.toFixed(2);
}

let chartInstance = null;
function drawCharts() {
    const totalBudget = initialBudget;
    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const goalsTotal = goals.reduce((sum, goal) => sum + goal.current_amount, 0);

    const pieCtx = document.getElementById('budgetChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Remaining Budget', 'Expenses', 'Goals', 'Savings'],
            datasets: [{
                data: [
                    totalBudget > 0 ? (budget / totalBudget * 100).toFixed(2) : 0,
                    totalBudget > 0 ? (expensesTotal / totalBudget * 100).toFixed(2) : 0,
                    totalBudget > 0 ? (goalsTotal / totalBudget * 100).toFixed(2) : 0,
                    totalBudget > 0 ? (savings_balance / totalBudget * 100).toFixed(2) : 0
                ],
                backgroundColor: ['#1a2b49', '#d4af37', '#27ae60', '#4a5e83'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 14, family: 'Roboto', weight: '700' } } },
                title: { display: true, text: 'Budget Allocation (% of Total Budget)', font: { size: 18 } },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw}%` } }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800
            }
        }
    });

    const barCtx = document.getElementById('sankeyChart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Expenses', 'Savings'],
            datasets: [{
                label: 'Amount (₹)',
                data: [expensesTotal, savings_balance],
                backgroundColor: ['#d4af37', '#4a5e83'],
                borderWidth: 1,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Expense vs Savings Breakdown', font: { size: 18 } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Amount (₹)' } }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Animation Functions
function animatePageLoad() {
    anime({
        targets: '.sidebar',
        translateX: [-250, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutExpo'
    });
    anime({
        targets: '.content',
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutExpo',
        delay: 200
    });
    anime({
        targets: '.sidebar-btn',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutExpo',
        delay: anime.stagger(100)
    });
}

function animateNewExpense(element) {
    anime({
        targets: element,
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.95, 1],
        duration: 500,
        easing: 'easeOutExpo'
    });
}

function animateNewGoal(element) {
    anime({
        targets: element,
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.95, 1],
        duration: 500,
        easing: 'easeOutExpo'
    });
}

function animateValueUpdate(selector, start, end) {
    anime({
        targets: selector,
        value: [start, end],
        round: 2,
        duration: 800,
        easing: 'easeOutExpo'
    });
}

function animateErrorMessage() {
    anime({
        targets: '#errorMessage',
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 500,
        easing: 'easeOutExpo'
    });
}

// Initialize goal listeners and analysis on page load
document.addEventListener('DOMContentLoaded', () => {
    attachGoalListenersToAll();
    document.querySelectorAll('#goalList .goal-item').forEach(goalItem => {
        const goal = goals.find(g => g.goal_name === goalItem.dataset.goalName);
        if (goal) updateGoalAnalysis(goalItem, goal);
    });
    updateGoalsAnalysis();
    showSection('budgetSection'); // Default to Budget section on load
});
