import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Login from './pages/Login';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminLogin from './pages/AdminLogin';
import DeliveryLogin from './pages/DeliveryLogin';
import Showcase from './pages/Showcase';
import { CartProvider } from './context/CartContext';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import Gallery from './pages/Gallery';
import About from './pages/About';
import Contact from './pages/Contact';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/customer" element={<CustomerLogin />} />
              <Route path="/login/admin" element={<AdminLogin />} />
              <Route path="/login/delivery" element={<DeliveryLogin />} />
              <Route path="/register/customer" element={<CustomerRegister />} />
              
              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/delivery"
                element={
                  <ProtectedRoute allowedRoles={['delivery_partner']}>
                    <DeliveryDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/showcase" element={<Showcase />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
