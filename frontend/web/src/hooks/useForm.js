import { useState } from 'react';

export function useForm(initialValues, onSubmit, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }
    setIsLoading(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return { values, errors, isLoading, submitError, handleChange, handleSubmit, setErrors };
}
