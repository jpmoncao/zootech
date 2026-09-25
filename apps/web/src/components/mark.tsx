type MarkProps = {
  size?: number;
};

export function Mark({ size = 30 }: MarkProps) {
  const height = Math.round(size * (34 / 30));
  return (
    <svg
      className="[view-transition-name:zoot-mark] [flex:none]"
      width={size}
      height={height}
      viewBox="0 0 30 34"
      aria-hidden="true"
    >
      <path
        d="M15 1 L28 6 V17 C28 25 22 30.5 15 33 C8 30.5 2 25 2 17 V6 Z"
        fill="#E8A317"
      />
      <circle cx="15" cy="20" r="4.2" fill="#0C4549" />
      <circle cx="9.5" cy="13.5" r="2.2" fill="#0C4549" />
      <circle cx="13" cy="10.5" r="2.2" fill="#0C4549" />
      <circle cx="17" cy="10.5" r="2.2" fill="#0C4549" />
      <circle cx="20.5" cy="13.5" r="2.2" fill="#0C4549" />
    </svg>
  );
}
