import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Coffee, ShoppingBag, User, LogOut, X, Plus, Minus, CheckCircle } from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { cn } from './lib/utils';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

interface CartItem extends Product {
  quantity: number;
}

// --- Data (Seed) ---
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Espresso Serenidad',
    description: 'Un golpe de energía pura. Extracción de 30 ml de granos de origen único con notas a chocolate amargo y frutos rojos.',
    price: 3.50,
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    name: 'Latte Suspiro',
    description: 'La mezcla perfecta de espresso suave, leche texturizada como seda y un toque de vainilla natural. Ideal para una tarde de lluvia.',
    price: 4.80,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    name: 'Mocha Refugio',
    description: 'Para los amantes del dulce. Chocolate artesanal derretido, café de especialidad y coronado con crema batida espolvoreada con cacao.',
    price: 5.20,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    name: 'Cold Brew Brisa',
    description: 'Infusión en frío por 18 horas. Refrescante, con baja acidez y notas cítricas. Servido sobre hielo cristalino con una rodaja de naranja.',
    price: 4.50,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    name: 'Matcha Calma',
    description: 'Para los días sin café. Té verde matcha ceremonial batido a mano con leche de avena.',
    price: 5.50,
    imageUrl: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&q=80&w=800'
  }
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    // In a real app, we would fetch products from Firestore here.
    // For this demo, we'll use the initial seeded data.
    
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      handleLogin();
      return;
    }
    
    if (cart.length === 0) return;
    
    setIsCheckingOut(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: cartTotal,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setCart([]);
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 3000);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-cream text-espresso font-sans selection:bg-caramel selection:text-white">
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-cream/80 backdrop-blur-md border-b border-mocha/20">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <Coffee className="w-8 h-8 text-caramel transition-transform group-hover:scale-110" />
              <span className="font-serif text-2xl font-bold tracking-wider">CALMA</span>
            </Link>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-espresso hover:text-caramel transition-colors"
              >
                <ShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-caramel text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                    {cartCount}
                  </span>
                )}
              </button>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-mocha">
                    <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-mocha/30" />
                    <span>{user.displayName?.split(' ')[0]}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-espresso hover:text-caramel transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 bg-espresso text-cream px-5 py-2.5 rounded-full font-medium hover:bg-caramel transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Ingresar</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<HomePage products={products} onAddToCart={addToCart} />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-espresso text-cream/80 py-12 mt-24">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <Coffee className="w-10 h-10 mx-auto mb-6 text-caramel opacity-80" />
            <h2 className="font-serif text-3xl mb-4 text-cream">CALMA</h2>
            <p className="max-w-md mx-auto mb-8 text-sm leading-relaxed">
              Un espacio para pausar, respirar y disfrutar del mejor café de especialidad.
            </p>
            <div className="text-xs opacity-60">
              &copy; {new Date().getFullYear()} CALMA Café. Todos los derechos reservados.
            </div>
          </div>
        </footer>

        {/* Cart Sidebar */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-espresso/40 backdrop-blur-sm z-50"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full max-w-md bg-cream z-50 shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-mocha/20 flex items-center justify-between bg-cream">
                  <h2 className="font-serif text-2xl font-bold">Tu Pedido</h2>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 hover:bg-mocha/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-mocha/60">
                      <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
                      <p>Tu carrito está vacío</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="mt-6 text-caramel font-medium hover:underline"
                      >
                        Ver el catálogo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cart.map(item => (
                        <div key={item.id} className="flex gap-4 items-center">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-20 h-20 object-cover rounded-xl shadow-sm"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-espresso">{item.name}</h3>
                            <p className="text-caramel font-semibold">${item.price.toFixed(2)}</p>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 rounded-full bg-mocha/10 flex items-center justify-center hover:bg-mocha/20 transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-4 text-center font-medium">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-8 h-8 rounded-full bg-mocha/10 flex items-center justify-center hover:bg-mocha/20 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right font-semibold text-espresso">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {cart.length > 0 && (
                  <div className="p-6 bg-white border-t border-mocha/10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg text-mocha">Total</span>
                      <span className="text-2xl font-serif font-bold text-espresso">${cartTotal.toFixed(2)}</span>
                    </div>
                    
                    {orderSuccess ? (
                      <div className="bg-green-50 text-green-800 p-4 rounded-xl flex items-center justify-center gap-2 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        ¡Pedido confirmado!
                      </div>
                    ) : (
                      <button 
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="w-full bg-caramel hover:bg-espresso text-white py-4 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {isCheckingOut ? (
                          <span className="animate-pulse">Procesando...</span>
                        ) : (
                          <>
                            {user ? 'Confirmar Pedido' : 'Inicia sesión para pedir'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}

// --- Page Components ---

function HomePage({ products, onAddToCart }: { products: Product[], onAddToCart: (p: Product) => void }) {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-caramel/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-[30rem] h-[30rem] bg-mocha/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-caramel/10 text-caramel font-medium text-sm mb-6 border border-caramel/20">
              Café de Especialidad
            </div>
            <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] mb-6 text-espresso">
              Encuentra tu <br/>
              <span className="text-caramel italic">calma</span> interior.
            </h1>
            <p className="text-lg text-mocha mb-10 leading-relaxed">
              Un espacio diseñado para pausar. Disfruta de nuestra selección de granos tostados artesanalmente, preparados con precisión y amor.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="#menu" 
                className="bg-espresso text-cream px-8 py-4 rounded-full font-medium hover:bg-caramel transition-colors shadow-lg shadow-espresso/20"
              >
                Ver el Menú
              </a>
              <a 
                href="#about" 
                className="bg-white text-espresso px-8 py-4 rounded-full font-medium hover:bg-cream transition-colors border border-mocha/20"
              >
                Nuestra Historia
              </a>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden md:block"
          >
            {/* 3D Coffee Cup Illustration Placeholder */}
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-tr from-caramel/20 to-transparent rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
              <img 
                src="https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=1000" 
                alt="Taza de café perfecta" 
                className="w-full h-full object-cover rounded-full shadow-2xl border-8 border-white/50"
                referrerPolicy="no-referrer"
              />
              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-mocha/10 backdrop-blur-sm"
              >
                <span className="text-2xl">✨</span>
              </motion.div>
              <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-10 -left-10 bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-mocha/10"
              >
                <div className="text-sm font-bold text-espresso">Origen Único</div>
                <div className="text-xs text-mocha">Colombia, Finca El Paraíso</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-24 bg-white relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 text-espresso">Nuestro Catálogo</h2>
            <p className="text-mocha text-lg">
              Cada taza es una experiencia. Seleccionamos los mejores granos para ofrecerte momentos de verdadera calma.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group bg-cream/30 rounded-3xl p-4 border border-mocha/10 hover:bg-cream transition-colors hover:shadow-xl hover:shadow-caramel/5"
              >
                <div className="relative h-64 mb-6 overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-espresso/10 group-hover:bg-transparent transition-colors z-10" />
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full font-bold text-espresso shadow-sm">
                    ${product.price.toFixed(2)}
                  </div>
                </div>
                
                <div className="px-2 pb-4">
                  <h3 className="font-serif text-2xl font-bold mb-2 text-espresso group-hover:text-caramel transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-mocha text-sm leading-relaxed mb-6 line-clamp-3">
                    {product.description}
                  </p>
                  
                  <button 
                    onClick={() => onAddToCart(product)}
                    className="w-full py-3.5 rounded-xl bg-white text-espresso font-medium border border-mocha/20 hover:bg-espresso hover:text-white hover:border-espresso transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Agregar al pedido
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Mini About Section */}
      <section id="about" className="py-24 bg-espresso text-cream">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-8">La Filosofía Calma</h2>
          <p className="text-lg md:text-xl text-cream/80 leading-relaxed font-light">
            Creemos que en un mundo que va demasiado rápido, tomarse un café debería ser un ritual sagrado. 
            No usamos atajos. Tostamos nuestros granos semanalmente, medimos cada extracción con precisión 
            y servimos cada taza con la intención de regalarte cinco minutos de paz absoluta.
          </p>
        </div>
      </section>
    </div>
  );
}
