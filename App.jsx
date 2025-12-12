import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initializeApp
} from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { LogIn, UserPlus, LogOut, Loader2, Save, X, Calendar, Clock, BarChart, AlertTriangle } from 'lucide-react';

// =========================================================================
// 1. CONFIGURAÇÃO E HOOKS DO FIREBASE
// =========================================================================

// As variáveis globais __app_id, __firebase_config e __initial_auth_token
// são fornecidas pelo ambiente.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Hook para gerenciar o estado da autenticação
const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing. Cannot initialize.");
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          // Usuário autenticado (token ou login manual)
          setUser(currentUser);
        } else if (initialAuthToken) {
          // Tenta o login com o token inicial fornecido pelo ambiente Canvas
          try {
            await signInWithCustomToken(authInstance, initialAuthToken);
          } catch (error) {
            console.error("Erro ao fazer login com custom token:", error);
            // Se falhar, o estado continua null, forçando o login ou registro
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Erro ao inicializar Firebase:", e);
      setLoading(false);
    }
  }, []);

  // Função de Logout
  const handleSignOut = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUser(null);
        // Limpa o remember me
        localStorage.removeItem('glico_auth_email');
        localStorage.removeItem('glico_auth_password');
        console.log('Logout bem-sucedido.');
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
      }
    }
  }, [auth]);

  return { user, loading, db, auth, handleSignOut };
};

// =========================================================================
// 2. COMPONENTES UTILITÁRIOS
// =========================================================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, disabled = false, icon: Icon, className = '', variant = 'primary' }) => {
  let baseStyle = "flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md";
  let variantStyle = "";

  switch (variant) {
    case 'primary':
      variantStyle = "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300";
      break;
    case 'secondary':
      variantStyle = "bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:bg-gray-100";
      break;
    case 'danger':
      variantStyle = "bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300";
      break;
    case 'link':
      variantStyle = "text-indigo-600 hover:text-indigo-800 bg-transparent shadow-none p-0";
      baseStyle = "flex items-center justify-center space-x-1 font-medium transition-colors duration-200";
      break;
    default:
      variantStyle = "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{children}</span>
    </button>
  );
};

const Input = ({ label, id, type = 'text', value, onChange, placeholder, required = false, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
    />
  </div>
);

const DateInput = ({ label, id, value, onChange, required = false, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type="date"
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
    />
  </div>
);

const TimeInput = ({ label, id, value, onChange, required = false, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type="time"
      step="60" // Apenas horas e minutos
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
    />
  </div>
);

const Message = ({ children, type = 'info' }) => {
  let style = "";
  switch (type) {
    case 'error':
      style = "bg-red-100 text-red-700 border-red-300";
      break;
    case 'success':
      style = "bg-green-100 text-green-700 border-green-300";
      break;
    case 'warning':
      style = "bg-yellow-100 text-yellow-700 border-yellow-300";
      break;
    case 'info':
    default:
      style = "bg-blue-100 text-blue-700 border-blue-300";
      break;
  }
  return (
    <div className={`p-3 border rounded-lg text-sm ${style}`} role="alert">
      {children}
    </div>
  );
};

// =========================================================================
// 3. FUNÇÕES DE AUTENTICAÇÃO (LOGIN/REGISTRO)
// =========================================================================

const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada.';
    case 'auth/user-not-found':
      return 'Nenhum usuário encontrado com este e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'A senha está incorreta.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    default:
      return 'Ocorreu um erro desconhecido. Por favor, tente novamente.';
  }
};

const Login = ({ auth, setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carregar credenciais salvas (se houver)
  useEffect(() => {
    const savedEmail = localStorage.getItem('glico_auth_email');
    const savedPassword = localStorage.getItem('glico_auth_password');
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
    setRememberMe(!!savedEmail);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (rememberMe) {
      localStorage.setItem('glico_auth_email', email);
      localStorage.setItem('glico_auth_password', password);
    } else {
      localStorage.removeItem('glico_auth_email');
      localStorage.removeItem('glico_auth_password');
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getErrorMessage(err.code));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Acessar Glicemia Control</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="E-mail (Nome de Usuário)"
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
        />
        <Input
          label="Senha"
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Sua senha secreta"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="remember-me" className="text-sm text-gray-700">
              Salvar usuário e senha neste dispositivo
            </label>
          </div>
        </div>

        {error && <Message type="error">{error}</Message>}

        <Button type="submit" disabled={loading} icon={loading ? Loader2 : LogIn} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-sm text-gray-600 mb-2">Não tem uma conta?</p>
        <Button onClick={() => setView('register')} variant="secondary" icon={UserPlus} className="w-full">
          Cadastrar Novo Usuário
        </Button>
      </div>
    </Card>
  );
};

const Register = ({ auth, setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Em um app real, o "username" seria salvo em outro lugar,
    // mas aqui o e-mail será usado como identificador de login.
    const username = email; // Simplesmente usando o e-mail como username aqui

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess('Cadastro realizado com sucesso! Você será logado automaticamente.');
      // O onAuthStateChanged do hook pai cuidará do login.
    } catch (err) {
      setError(getErrorMessage(err.code));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Cadastro de Novo Usuário</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          label="E-mail"
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com (Será seu login)"
        />
        {/*
        Nota: O campo "Nome de Usuário" é substituído pelo E-mail,
        que é o identificador único para o Firebase Auth.
        O Firebase Auth não armazena um campo "username" por padrão.
        */}
        <Input
          label="Senha (Mínimo 6 caracteres)"
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Sua senha"
        />

        {error && <Message type="error">{error}</Message>}
        {success && <Message type="success">{success}</Message>}

        <Button type="submit" disabled={loading} icon={loading ? Loader2 : UserPlus} className="w-full">
          {loading ? 'Cadastrando...' : 'Cadastrar e Entrar'}
        </Button>
      </form>
      <div className="mt-6 pt-4 border-t text-center">
        <Button onClick={() => setView('login')} variant="link">
          <LogIn className="w-4 h-4 mr-1" />
          Voltar para o Login
        </Button>
      </div>
    </Card>
  );
};

// =========================================================================
// 4. FUNÇÕES DO APLICATIVO PRINCIPAL (TRACKER)
// =========================================================================

const GlicemiaTracker = ({ db, userId, handleSignOut }) => {
  const GLICEMIA_COLLECTION = `artifacts/${appId}/users/${userId}/glicemia_records`;

  // Formulário
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
  const [glicemia, setGlicemia] = useState('');
  const [data, setData] = useState(today);
  const [hora, setHora] = useState(currentTime);
  const [loadingSave, setLoadingSave] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: null, text: '' });

  // Listagem de Registros
  const [registros, setRegistros] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [dataInicio, setDataInicio] = useState(today);
  const [dataFim, setDataFim] = useState(today);

  // Função para salvar novo registro
  const handleSave = async (e) => {
    e.preventDefault();
    setLoadingSave(true);
    setSaveMessage({ type: null, text: '' });

    const glicemiaValue = parseFloat(glicemia);
    if (isNaN(glicemiaValue) || glicemiaValue <= 0) {
      setSaveMessage({ type: 'error', text: 'Por favor, insira um valor de glicemia válido.' });
      setLoadingSave(false);
      return;
    }

    try {
      // Cria um objeto Date para o timestamp (YYYY-MM-DDTHH:MM:SS.sssZ)
      const dateString = `${data}T${hora}:00`;
      const recordDate = new Date(dateString);

      if (isNaN(recordDate.getTime())) {
         setSaveMessage({ type: 'error', text: 'Data ou hora inválida.' });
         setLoadingSave(false);
         return;
      }

      await addDoc(collection(db, GLICEMIA_COLLECTION), {
        glicemia: glicemia, // Salva como string
        data: data.split('-').reverse().join('/'), // Salva como DD/MM/YYYY
        hora: hora, // Salva como HH:MM
        timestamp: Timestamp.fromDate(recordDate),
      });

      setSaveMessage({ type: 'success', text: `Registro de ${glicemia} mg/dL salvo com sucesso!` });
      setGlicemia(''); // Limpa o campo após salvar
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setLoadingSave(false);
      setTimeout(() => setSaveMessage({ type: null, text: '' }), 4000);
    }
  };

  // Função para carregar registros (usa onSnapshot para real-time)
  useEffect(() => {
    if (!db || !userId) return;

    // Converte DD/MM/YYYY para Date para filtragem
    const startOfDay = new Date(`${dataInicio}T00:00:00`);
    const endOfDay = new Date(`${dataFim}T23:59:59`);

    const q = query(
      collection(db, GLICEMIA_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
      where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('timestamp', 'desc'), // Ordena do mais novo para o mais antigo
      limit(100) // Limita para evitar grandes cargas de dados
    );

    setLoadingRecords(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRegistros(fetchedRecords);
      setLoadingRecords(false);
    }, (error) => {
      console.error("Erro ao ouvir registros:", error);
      setLoadingRecords(false);
      // Você pode adicionar um alerta aqui
    });

    // Limpa o listener ao desmontar ou quando as dependências mudam
    return () => unsubscribe();
  }, [db, userId, dataInicio, dataFim]);

  // Cálculo de estatísticas e cores
  const stats = useMemo(() => {
    if (registros.length === 0) return { avg: 0, count: 0, min: 0, max: 0, status: 'info' };
    const values = registros.map(r => parseFloat(r.glicemia)).filter(v => !isNaN(v));
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = values.length;

    let status = 'normal';
    let color = 'bg-green-500';
    if (avg < 70) {
      status = 'hipoglicemia';
      color = 'bg-blue-500';
    } else if (avg > 180) {
      status = 'hiperglicemia';
      color = 'bg-red-500';
    } else if (avg >= 70 && avg <= 130) {
      status = 'ótimo';
      color = 'bg-lime-600';
    } else if (avg > 130 && avg <= 180) {
      status = 'moderado';
      color = 'bg-yellow-500';
    }

    return {
      avg: avg.toFixed(1),
      count,
      min: min.toFixed(0),
      max: max.toFixed(0),
      status,
      color
    };
  }, [registros]);

  // Função para determinar o estilo do valor
  const getGlicemiaStyle = (value) => {
    const val = parseFloat(value);
    if (val < 70) return 'text-blue-600 font-bold bg-blue-50 border-blue-200';
    if (val <= 130) return 'text-green-600 font-bold bg-green-50 border-green-200';
    if (val <= 180) return 'text-yellow-700 font-bold bg-yellow-50 border-yellow-200';
    return 'text-red-600 font-bold bg-red-50 border-red-200';
  };


  return (
    <div className="flex flex-col space-y-6">
      {/* HEADER */}
      <header className="flex justify-between items-center bg-indigo-600 text-white p-4 rounded-b-xl shadow-lg no-print">
        <h1 className="text-xl font-bold">Glicemia Control</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium hidden sm:inline-block truncate">Usuário ID: {userId.substring(0, 8)}...</span>
          <Button onClick={handleSignOut} variant="danger" icon={LogOut} className="text-xs">
            Sair
          </Button>
        </div>
      </header>

      {/* 1. REGISTRO DE GLICEMIA */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
          <Save className="w-5 h-5 text-indigo-600" />
          <span>Novo Registro</span>
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Valor da Glicemia (mg/dL)"
            id="glicemia"
            type="number"
            value={glicemia}
            onChange={(e) => setGlicemia(e.target.value)}
            placeholder="Ex: 120"
            required
            className="col-span-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Data"
              id="data"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
            <TimeInput
              label="Hora"
              id="hora"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
            />
          </div>

          {saveMessage.text && (
            <Message type={saveMessage.type}>
              {saveMessage.text}
            </Message>
          )}

          <Button type="submit" disabled={loadingSave} icon={loadingSave ? Loader2 : Save} className="w-full mt-4">
            {loadingSave ? 'Salvando...' : 'Salvar Registro'}
          </Button>
        </form>
      </Card>

      {/* 2. FILTRO E RESULTADOS */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
          <BarChart className="w-5 h-5 text-indigo-600" />
          <span>Histórico e Estatísticas</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <DateInput
            label="De"
            id="data-inicio"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <DateInput
            label="Até"
            id="data-fim"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>

        {/* Estatísticas */}
        <div className="flex flex-col space-y-3 p-4 bg-gray-50 rounded-lg border mb-4">
          <h3 className="font-semibold text-lg text-gray-700">Resumo do Período ({stats.count} Registros)</h3>
          {loadingRecords ? (
             <p className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando estatísticas...</p>
          ) : stats.count > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-sm font-medium">
              <div className="text-gray-600">Média:</div>
              <div className={`text-right font-bold ${stats.color.replace('bg-', 'text-')}`}>{stats.avg} mg/dL</div>

              <div className="text-gray-600">Mínimo:</div>
              <div className="text-right text-green-700">{stats.min} mg/dL</div>

              <div className="text-gray-600">Máximo:</div>
              <div className="text-right text-red-700">{stats.max} mg/dL</div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum registro encontrado no período selecionado.</p>
          )}
        </div>


        {/* Tabela de Registros */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Glicemia</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingRecords ? (
                <tr>
                  <td colSpan="3" className="px-3 py-4 text-center text-sm text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-3 py-4 text-center text-sm text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((reg, index) => (
                  <tr key={reg.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm border rounded-lg ${getGlicemiaStyle(reg.glicemia)}`}>
                      {reg.glicemia} mg/dL
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{reg.data}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{reg.hora}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          * A tabela é atualizada automaticamente em tempo real (onSnapshot).
        </p>
      </Card>
    </div>
  );
};

// =========================================================================
// 5. COMPONENTE PRINCIPAL (APP)
// =========================================================================

const App = () => {
  const { user, loading: loadingAuth, db, auth, handleSignOut } = useFirebaseAuth();
  const [view, setView] = useState('login'); // 'login', 'register', 'tracker'

  // Redireciona a visualização com base no estado de autenticação
  useEffect(() => {
    if (loadingAuth) return;
    if (user) {
      setView('tracker');
    } else {
      setView('login');
    }
  }, [user, loadingAuth]);

  const renderContent = () => {
    if (loadingAuth) {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-lg text-gray-600">Carregando aplicação...</p>
        </div>
      );
    }

    if (user) {
      return <GlicemiaTracker db={db} userId={user.uid} handleSignOut={handleSignOut} />;
    }

    switch (view) {
      case 'register':
        return <Register auth={auth} setView={setView} />;
      case 'login':
      default:
        return <Login auth={auth} setView={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <style>
        {`
          body { font-family: 'Inter', sans-serif; }
          .app-container {
              max-width: 480px;
              margin: 0 auto;
              min-height: 100vh;
              background-color: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          }
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background-color: white; }
            /* Não é necessário print-color-adjust aqui pois o React está usando Tailwind */
          }
        `}
      </style>
      <div className="app-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
