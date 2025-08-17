from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import csv
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey123'

# Ensure CSV files exist
for file in ['users.csv', 'finances.csv', 'goals.csv', 'savings.csv']:
    if not os.path.exists(file):
        with open(file, 'w', newline='') as f:
            writer = csv.writer(f)
            if file == 'users.csv':
                writer.writerow(['username', 'password'])
            elif file == 'finances.csv':
                writer.writerow(['username', 'budget', 'reason', 'amount'])
            elif file == 'goals.csv':
                writer.writerow(['username', 'goal_name', 'target_amount', 'current_amount'])
            elif file == 'savings.csv':
                writer.writerow(['username', 'savings_balance'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/auth', methods=['POST'])
def auth():
    username = request.json.get('username')
    password = request.json.get('password')
    action = request.json.get('action')
    
    with open('users.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        users = list(reader)
        if action == 'signup':
            if any(user[0] == username for user in users):
                return jsonify({'success': False, 'message': 'Username already exists!'})
            writer = csv.writer(f)
            writer.writerow([username, password])
            return jsonify({'success': True, 'message': 'Signup successful! Please login.'})
        elif action == 'login':
            if any(user[0] == username and user[1] == password for user in users):
                session['username'] = username
                return jsonify({'success': True, 'redirect': url_for('dashboard')})
            return jsonify({'success': False, 'message': 'Login credentials are incorrect'})

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('index'))
    username = session['username']
    budget, expenses = get_user_data(username)
    goals = get_user_goals(username)
    savings_balance = get_savings_balance(username)
    return render_template('dashboard.html', username=username, budget=budget, expenses=expenses, goals=goals, savings_balance=savings_balance)

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return '', 204

@app.route('/increase_budget', methods=['POST'])
def increase_budget():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    amount = request.json.get('amount', 0)
    if amount <= 0:
        return "Invalid amount", 400
    with open('finances.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if not user_data:
            writer = csv.writer(f)
            writer.writerow([username, amount, '', ''])
        else:
            for i, row in enumerate(data):
                if row[0] == username and row[2] == '':
                    data[i][1] = str(float(row[1]) + amount)
                    break
            f.seek(0)
            f.truncate()
            writer = csv.writer(f)
            writer.writerows(data)
    return '', 204

@app.route('/add_expense', methods=['POST'])
def add_expense():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    amount = request.json.get('amount', 0)
    reason = request.json.get('reason', '')
    if amount <= 0 or not reason:
        return "Invalid input", 400
    with open('finances.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            budget = float(user_data[0][1]) - amount
            for i, row in enumerate(data):
                if row[0] == username and row[2] == '':
                    data[i][1] = str(budget)
                    break
            f.seek(0)
            f.truncate()
            writer = csv.writer(f)
            writer.writerows(data)
            writer.writerow([username, budget, reason, amount])
        else:
            budget = 0 - amount
            writer = csv.writer(f)
            writer.writerow([username, budget, '', ''])
            writer.writerow([username, budget, reason, amount])
    return jsonify({'success': True, 'budget': budget})

@app.route('/clear_data', methods=['POST'])
def clear_data():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = [row for row in reader if row[0] != username]
    with open('finances.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)
        writer.writerow([username, 0, '', ''])
    return '', 204

@app.route('/add_goal', methods=['POST'])
def add_goal():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    goal_name = request.json.get('goal_name', '')
    target_amount = request.json.get('target_amount', 0)
    if not goal_name or target_amount <= 0:
        return "Invalid goal data", 400
    with open('goals.csv', 'a+', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([username, goal_name, target_amount, 0])
    return jsonify({'success': True})

@app.route('/update_goal', methods=['POST'])
def update_goal():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    goal_name = request.json.get('goal_name', '')
    amount = request.json.get('amount', 0)
    if not goal_name or amount <= 0:
        return "Invalid update data", 400

    # Check budget sufficiency
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username and row[2] == '']
        if not user_data or float(user_data[0][1]) < amount:
            return jsonify({'success': False, 'message': 'Insufficient budget'}), 400
        budget = float(user_data[0][1])

    # Update goal
    goal_found = False
    with open('goals.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        for i, row in enumerate(data):
            if row[0] == username and row[1] == goal_name:
                current_amount = float(row[3]) + amount
                data[i][3] = str(current_amount)
                goal_found = True
                break
    if not goal_found:
        return jsonify({'success': False, 'message': 'Goal not found'}), 404
    with open('goals.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)

    # Deduct from main budget
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        for i, row in enumerate(data):
            if row[0] == username and row[2] == '':
                data[i][1] = str(budget - amount)
                break
    with open('finances.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)

    # Add to savings
    with open('savings.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if not user_data:
            writer = csv.writer(f)
            writer.writerow([username, amount])
            savings_balance = amount
        else:
            savings_balance = float(user_data[0][1]) + amount
            for i, row in enumerate(data):
                if row[0] == username:
                    data[i][1] = str(savings_balance)
                    break
            f.seek(0)
            f.truncate()
            writer = csv.writer(f)
            writer.writerows(data)

    return jsonify({'success': True, 'budget': budget - amount, 'savings_balance': savings_balance, 'current_amount': current_amount})

@app.route('/delete_goal', methods=['POST'])
def delete_goal():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    goal_name = request.json.get('goal_name', '')
    if not goal_name:
        return "Invalid goal name", 400
    
    # Get current amount of goal
    current_amount = 0
    with open('goals.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        for row in data:
            if row[0] == username and row[1] == goal_name:
                current_amount = float(row[3])
                break
        else:
            return jsonify({'success': False, 'message': 'Goal not found'}), 404
    
    # Delete goal
    updated_data = [row for row in data if not (row[0] == username and row[1] == goal_name)]
    with open('goals.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(updated_data)
    
    # Refund to main budget
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            budget = float(user_data[0][1]) + current_amount
            for i, row in enumerate(data):
                if row[0] == username and row[2] == '':
                    data[i][1] = str(budget)
                    break
            with open('finances.csv', 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(data)
    
    # Deduct from savings (ensure non-negative)
    with open('savings.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            savings_balance = max(0, float(user_data[0][1]) - current_amount)
            for i, row in enumerate(data):
                if row[0] == username:
                    data[i][1] = str(savings_balance)
                    break
            with open('savings.csv', 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(data)
        else:
            savings_balance = 0
    
    return jsonify({'success': True, 'budget': budget, 'savings_balance': savings_balance})

@app.route('/cancel_goal', methods=['POST'])
def cancel_goal():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    goal_name = request.json.get('goal_name', '')
    if not goal_name:
        return "Invalid goal name", 400
    
    # Get current amount of goal
    current_amount = 0
    with open('goals.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        for row in data:
            if row[0] == username and row[1] == goal_name:
                current_amount = float(row[3])
                break
        else:
            return jsonify({'success': False, 'message': 'Goal not found'}), 404
    
    # Cancel goal (remove it)
    updated_data = [row for row in data if not (row[0] == username and row[1] == goal_name)]
    with open('goals.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(updated_data)
    
    # Refund to main budget
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            budget = float(user_data[0][1]) + current_amount
            for i, row in enumerate(data):
                if row[0] == username and row[2] == '':
                    data[i][1] = str(budget)
                    break
            with open('finances.csv', 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(data)
    
    # Deduct from savings (ensure non-negative)
    with open('savings.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            savings_balance = max(0, float(user_data[0][1]) - current_amount)
            for i, row in enumerate(data):
                if row[0] == username:
                    data[i][1] = str(savings_balance)
                    break
            with open('savings.csv', 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(data)
        else:
            savings_balance = 0
    
    return jsonify({'success': True, 'budget': budget, 'savings_balance': savings_balance})

@app.route('/add_savings', methods=['POST'])
def add_savings():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    amount = request.json.get('amount', 0)
    source = request.json.get('source', 'direct')
    if amount <= 0:
        return "Invalid amount", 400
    
    with open('savings.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if not user_data:
            writer = csv.writer(f)
            writer.writerow([username, amount])
            savings_balance = amount
        else:
            savings_balance = float(user_data[0][1]) + amount
            for i, row in enumerate(data):
                if row[0] == username:
                    data[i][1] = str(savings_balance)
                    break
            f.seek(0)
            f.truncate()
            writer = csv.writer(f)
            writer.writerows(data)
    
    if source == 'main':
        with open('finances.csv', 'r', newline='') as f:
            reader = csv.reader(f)
            data = list(reader)
            user_data = [row for row in data if row[0] == username]
            if user_data and float(user_data[0][1]) >= amount:
                budget = float(user_data[0][1]) - amount
                for i, row in enumerate(data):
                    if row[0] == username and row[2] == '':
                        data[i][1] = str(budget)
                        break
                with open('finances.csv', 'w', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerows(data)
                return jsonify({'success': True, 'budget': budget, 'savings_balance': savings_balance})
            return jsonify({'success': False, 'message': 'Insufficient budget'}), 400
    return jsonify({'success': True, 'savings_balance': savings_balance})

@app.route('/withdraw_savings', methods=['POST'])
def withdraw_savings():
    if 'username' not in session:
        return "Unauthorized", 401
    username = session['username']
    amount = request.json.get('amount', 0)
    if amount <= 0:
        return "Invalid amount", 400
    
    # Check savings sufficiency
    with open('savings.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if not user_data or float(user_data[0][1]) < amount:
            return jsonify({'success': False, 'message': 'Insufficient savings'}), 400
        savings_balance = float(user_data[0][1]) - amount
    
    # Update savings
    for i, row in enumerate(data):
        if row[0] == username:
            data[i][1] = str(savings_balance)
            break
    with open('savings.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)
    
    # Add to main budget
    with open('finances.csv', 'r', newline='') as f:
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        if user_data:
            budget = float(user_data[0][1]) + amount
            for i, row in enumerate(data):
                if row[0] == username and row[2] == '':
                    data[i][1] = str(budget)
                    break
        else:
            budget = amount
            data.append([username, budget, '', ''])
        with open('finances.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(data)
    
    return jsonify({'success': True, 'budget': budget, 'savings_balance': savings_balance})

def get_user_data(username):
    with open('finances.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username and len(row) == 4]
        if not user_data:
            return 0, []
        budget = float(user_data[0][1])
        expenses = [{'reason': row[2], 'amount': float(row[3])} for row in user_data[1:] if row[2]]
        return budget, expenses

def get_user_goals(username):
    with open('goals.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        goals = [{'goal_name': row[1], 'target_amount': float(row[2]), 'current_amount': float(row[3])}
                 for row in data if row[0] == username and len(row) == 4]
        return goals

def get_savings_balance(username):
    with open('savings.csv', 'a+', newline='') as f:
        f.seek(0)
        reader = csv.reader(f)
        data = list(reader)
        user_data = [row for row in data if row[0] == username]
        return float(user_data[0][1]) if user_data else 0.0

if __name__ == '__main__':
    import os
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
