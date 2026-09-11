export const getDateFromFormat = (value) => {
  if (!value || value === '') {
    return '';
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

export const convertDateToFormat = (date) => {
  if (!date || date === '') {
    return '';
  }
  const d = new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};
