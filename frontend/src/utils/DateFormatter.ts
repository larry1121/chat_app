export const formatDate = (datetime: string) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };

  const date = new Date(datetime);

  // Format the time using toLocaleTimeString
  const time = date.toLocaleTimeString('ko-KR', options);

  // Format the date using toLocaleDateString
  const dateOptions: Intl.DateTimeFormatOptions = {
    // year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const formattedDate = date.toLocaleDateString('ko-KR', dateOptions);

  return `${formattedDate} ${time}`;
};
