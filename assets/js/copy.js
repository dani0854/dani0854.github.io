function copyText(element, fileAsCommand='', onClickClass='fa-solid fa-square-check') {
  const customHighlightDiv = element.closest('.custom-highlight');
  let code = customHighlightDiv.getAttribute('code');
  const additionalInputsDiv = customHighlightDiv.querySelector('.custom-highlight-additionals-input');

  if (additionalInputsDiv) {
    const inputs = additionalInputsDiv.querySelectorAll('input');

    inputs.forEach(input => {
      const from = "$" + input.getAttribute('id');
      const to = input.value.trim();
      if (to !== '') {
        code = code.replaceAll(from, to)
      }
    });
  }

  if (fileAsCommand !== '') {
    code = 'cat <<EOF > "' + fileAsCommand + '" \n' + code.replaceAll('$', '\\$') + '\nEOF'
  }
  
  navigator.clipboard.writeText(code).then(() => {
    const icon = element.querySelector('i');
    const originalClass = icon.className;

    icon.className = onClickClass;
    
    setTimeout(() => {
      icon.className = originalClass;
    }, 300);
  });
}
