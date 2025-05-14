document.addEventListener('DOMContentLoaded', function() {
    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDg6M3Q6sr8lKzWLp8rtedLIl6l36pICAY",
        authDomain: "control-financiero-c836e.firebaseapp.com",
        projectId: "control-financiero-c836e",
        storageBucket: "control-financiero-c836e.firebasestorage.app",
        messagingSenderId: "52286261134",
        appId: "1:52286261134:web:ce359e8a3054377fb4c6df",
        measurementId: "G-447RL559B6"
    };

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Elementos del DOM
    const loader = document.getElementById('loader');
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const currentMonthEl = document.getElementById('currentMonth');
    const incomeAmountEl = document.getElementById('incomeAmount');
    const expensesAmountEl = document.getElementById('expensesAmount');
    const balanceAmountEl = document.getElementById('balanceAmount');
    const recentTransactionsList = document.getElementById('recentTransactionsList');
    const transactionsList = document.getElementById('transactionsList');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const transactionModal = document.getElementById('transactionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const transactionForm = document.getElementById('transactionForm');

    // Variables de estado
    let currentUser = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    // Inicialización
    initAuth();
    setupEventListeners();
    updateMonthDisplay();

    // Autenticación
    function initAuth() {
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                updateUserInfo(user);
                loginScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
                loadUserData();
            } else {
                currentUser = null;
                appContainer.classList.add('hidden');
                loginScreen.classList.remove('hidden');
            }
            toggleLoader(false);
        });
    }

    // Event listeners
    function setupEventListeners() {
        // Autenticación
        googleLoginBtn.addEventListener('click', signInWithGoogle);
        logoutBtn.addEventListener('click', signOut);
        
        // Navegación
        document.querySelectorAll('[data-view]').forEach(item => {
            item.addEventListener('click', switchView);
        });
        
        // Transacciones
        addTransactionBtn.addEventListener('click', () => {
            transactionModal.classList.add('active');
        });
        
        closeModalBtn.addEventListener('click', () => {
            transactionModal.classList.remove('active');
        });
        
        transactionForm.addEventListener('submit', handleTransactionSubmit);
        
        // Selector de mes
        document.getElementById('prevMonthBtn').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateMonthDisplay();
            loadUserData();
        });
        
        document.getElementById('nextMonthBtn').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            updateMonthDisplay();
            loadUserData();
        });
    }

    // Funciones de autenticación
    function signInWithGoogle() {
        toggleLoader(true);
        auth.signInWithPopup(provider)
            .catch(error => {
                console.error("Error de autenticación:", error);
                alert(`Error al iniciar sesión: ${error.message}`);
                toggleLoader(false);
            });
    }

    function signOut() {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            toggleLoader(true);
            auth.signOut()
                .finally(() => toggleLoader(false));
        }
    }

    // Actualizar UI
    function updateUserInfo(user) {
        userAvatar.textContent = user.displayName?.charAt(0).toUpperCase() || 'U';
        userName.textContent = user.displayName || 'Usuario';
        userEmail.textContent = user.email || '';
        
        if (user.photoURL) {
            userAvatar.style.backgroundImage = `url(${user.photoURL})`;
            userAvatar.textContent = '';
        }
    }

    function updateMonthDisplay() {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        currentMonthEl.textContent = `${months[currentMonth]} ${currentYear}`;
    }

    function toggleLoader(show) {
        loader.style.display = show ? 'flex' : 'none';
    }

    // Navegación
    function switchView(e) {
        const viewName = e.currentTarget.getAttribute('data-view');
        
        // Actualizar menú activo
        document.querySelectorAll('[data-view]').forEach(item => {
            item.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Mostrar vista correspondiente
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(`${viewName}View`).classList.remove('hidden');
    }

    // Cargar datos del usuario
    function loadUserData() {
        if (!currentUser) return;
        
        toggleLoader(true);
        
        // Obtener transacciones del mes actual
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        
        db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc')
            .get()
            .then(snapshot => {
                const transactions = [];
                let totalIncome = 0;
                let totalExpenses = 0;
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    transactions.push({
                        id: doc.id,
                        ...data,
                        date: data.date.toDate()
                    });
                    
                    if (data.type === 'income') {
                        totalIncome += parseFloat(data.amount);
                    } else {
                        totalExpenses += parseFloat(data.amount);
                    }
                });
                
                // Actualizar resumen
                incomeAmountEl.textContent = `$${totalIncome.toFixed(2)}`;
                expensesAmountEl.textContent = `$${totalExpenses.toFixed(2)}`;
                balanceAmountEl.textContent = `$${(totalIncome - totalExpenses).toFixed(2)}`;
                
                // Mostrar transacciones recientes (últimas 5)
                renderTransactions(transactions.slice(0, 5), recentTransactionsList);
                
                // Mostrar todas las transacciones en la vista correspondiente
                renderTransactions(transactions, transactionsList);
            })
            .catch(error => {
                console.error("Error cargando transacciones:", error);
            })
            .finally(() => {
                toggleLoader(false);
            });
    }

    // Renderizar transacciones
    function renderTransactions(transactions, container) {
        if (!transactions.length) {
            container.innerHTML = '<p class="no-transactions">No hay transacciones registradas</p>';
            return;
        }
        
        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <span class="material-icons">
                        ${transaction.type === 'income' ? 'trending_up' : 'trending_down'}
                    </span>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${getCategoryName(transaction.category)}</div>
                    <div class="transaction-date">
                        ${transaction.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${parseFloat(transaction.amount).toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    // Manejar formulario de transacción
    function handleTransactionSubmit(e) {
        e.preventDefault();
        
        if (!currentUser) return;
        
        toggleLoader(true);
        
        const transactionData = {
            amount: parseFloat(document.getElementById('transactionAmount').value),
            category: document.getElementById('transactionCategory').value,
            type: document.getElementById('transactionType').value,
            date: new Date(document.getElementById('transactionDate').value),
            notes: document.getElementById('transactionNotes').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        db.collection('users')
            .doc(currentUser.uid)
            .collection('transactions')
            .add(transactionData)
            .then(() => {
                transactionForm.reset();
                transactionModal.classList.remove('active');
                loadUserData();
            })
            .catch(error => {
                console.error("Error guardando transacción:", error);
                alert('Error al guardar la transacción');
            })
            .finally(() => {
                toggleLoader(false);
            });
    }

    // Helper functions
    function getCategoryName(categoryKey) {
        const categories = {
            'comida': 'Comida',
            'transporte': 'Transporte',
            'salario': 'Salario',
            'hogar': 'Hogar',
            'entretenimiento': 'Entretenimiento',
            'educacion': 'Educación',
            'salud': 'Salud',
            'otros': 'Otros'
        };
        
        return categories[categoryKey] || categoryKey;
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Toggle sidebar on menu button click
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });
    
    // Close sidebar when clicking on overlay
    sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        this.classList.remove('active');
    });
    
    // Close sidebar when clicking on menu items (opcional)
    const menuItems = document.querySelectorAll('.main-menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
});
// Evitar que el scroll del menú se propague a la página
document.querySelector('.main-menu').addEventListener('touchmove', function(e) {
    e.stopPropagation();
}, { passive: false });
// Toggle del menú flotante
const fabMain = document.getElementById('fabMain');
const fabContainer = document.getElementById('fabContainer');

fabMain.addEventListener('click', function(e) {
  e.stopPropagation();
  fabContainer.classList.toggle('active');
});

// Cerrar al hacer clic fuera
document.addEventListener('click', function() {
  fabContainer.classList.remove('active');
});

// Función para abrir el modal
function openTransactionModal(type) {
  // Tu código para abrir el modal aquí
  fabContainer.classList.remove('active');
}
