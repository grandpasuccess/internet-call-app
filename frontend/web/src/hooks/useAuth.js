export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      setIsLoading(false);
      return;
    }

    setUser(JSON.parse(storedUser));
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  return { user, isLoading, error, logout };
}
