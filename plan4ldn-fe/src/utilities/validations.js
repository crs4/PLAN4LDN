export function validatePassword (password, passwordConfirm) { 
  return ( password === passwordConfirm && password.length > 8) ;
}
export function validateName (name) { 
  return name.length > 0; 
};
