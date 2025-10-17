import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import * as api from './services/mockApi';
import { Layout } from './components/Layout';
import { UserPortal } from './components/UserPortal';
import { AdminPortal } from './pages/AdminPortal';
import { Card, Button, Spinner } from './components/SharedComponents';

// Initialize mock data when app loads
api.initializeData();

const App: React.FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if a user is already "logged in" from a previous session
        const currentlyLoggedIn = api.getLoggedInUser();
        if (currentlyLoggedIn) {
            setLoggedInUser(currentlyLoggedIn);
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const allUsers = await api.getUsers();
                setUsers(allUsers);
                if (allUsers.length > 0 && !selectedUserId) {
                    setSelectedUserId(allUsers[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleLogin = () => {
        const user = users.find(u => u.id === selectedUserId);
        if (user) {
            api.setLoggedInUser(user.id); 
            setLoggedInUser(user);
        }
    };

    const handleLogout = () => {
        api.logout();
        setLoggedInUser(null);
        if (users.length > 0) {
            setSelectedUserId(users[0].id);
        }
    };

    if (loggedInUser) {
        return (
            <Layout userRole={loggedInUser.role} onLogout={handleLogout}>
                {loggedInUser.role === UserRole.ADMIN ? <AdminPortal /> : <UserPortal />}
            </Layout>
        );
    }

    return (
        <div className="min-h-screen bg-secondary text-text-main flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-white mb-6">تسجيل الدخول</h2>
                {isLoading ? <div className="flex justify-center"><Spinner /></div> : (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="user-select" className="block text-sm font-medium text-text-secondary mb-2">
                                اختر مستخدمًا لتسجيل الدخول كـ:
                            </label>
                            <select
                                id="user-select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full bg-secondary text-white p-2 rounded-md mt-1 border border-gray-600 focus:ring-primary focus:border-primary"
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleLogin} className="w-full">
                            دخول
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default App;
