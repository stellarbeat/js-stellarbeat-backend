
export default (DateToCheck: Date) => {
    let date = new Date();
    let yesterday = new Date(date.getTime() - 24*60*60*1000);

    return DateToCheck.getTime() < yesterday.getTime();
}