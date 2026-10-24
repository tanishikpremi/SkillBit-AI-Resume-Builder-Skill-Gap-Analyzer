export type Category = "Programming Languages" | "Frameworks" | "Libraries" | "Databases" | "DevOps & Containers" | "AI / Machine Learning" | "Data & Analytics" | "Domain / SE Skills" | "Soft Skills" | "Developer Tools" | "Cybersecurity" | "Cloud Platforms"

export const CATEGORIES: Category[] = [
  "Programming Languages",
  "Frameworks",
  "Libraries",
  "Databases",
  "DevOps & Containers",
  "AI / Machine Learning",
  "Data & Analytics",
  "Domain / SE Skills",
  "Soft Skills",
  "Developer Tools",
  "Cybersecurity",
  "Cloud Platforms",
]

export interface Skill {
  name: string
  category: Category
  aliases: string[]
  /** Skills considered transferable for PARTIAL_MATCH detection */
  related?: string[]
  description?: string
}

const s = (
  name: string,
  category: Category,
  aliases: string[] = [],
  related: string[] = [],
): Skill => ({ name, category, aliases, related })

export const BASE_TAXONOMY: Skill[] = [
  // Programming Languages
  s("Python", "Programming Languages", ["python3", "py"], ["Go", "Ruby"]),
  s("JavaScript", "Programming Languages", ["js", "ecmascript", "es6"], [
    "TypeScript",
  ]),
  s("TypeScript", "Programming Languages", ["ts"], ["JavaScript"]),
  s("Java", "Programming Languages", ["java8", "java 17", "jvm"], [
    "Kotlin",
    "C#",
  ]),
  s("Go", "Programming Languages", ["golang"], ["Rust", "Python"]),
  s("Rust", "Programming Languages", ["rustlang"], ["C++", "Go"]),
  s("C++", "Programming Languages", ["cpp", "c plus plus"], ["C", "Rust"]),
  s("C", "Programming Languages", ["ansi c"], ["C++"]),
  s("C#", "Programming Languages", ["csharp", "c sharp"], ["Java"]),
  s("Kotlin", "Programming Languages", ["kt"], ["Java", "Swift"]),
  s("Swift", "Programming Languages", ["swiftui"], ["Kotlin"]),
  s("Ruby", "Programming Languages", ["rb"], ["Python"]),
  s("PHP", "Programming Languages", ["php8"], []),
  s(
    "SQL",
    "Programming Languages",
    ["t-sql", "pl/sql", "structured query language"],
    ["PostgreSQL", "MySQL"],
  ),
  s("Scala", "Programming Languages", [], ["Java", "Apache Spark"]),
  s("R", "Programming Languages", ["rlang", "r language"], ["Python"]),
  s("Bash", "Programming Languages", ["shell scripting", "shell", "zsh"], [
    "Linux",
  ]),
  s("Dart", "Programming Languages", [], ["Flutter"]),
  s("HTML/CSS", "Programming Languages", ["html", "html5", "css", "css3"], [
    "Tailwind CSS",
  ]),

  // Frameworks
  s("React", "Frameworks", ["react.js", "reactjs", "react js"], [
    "Vue.js",
    "Angular",
    "Next.js",
  ]),
  s("Next.js", "Frameworks", ["nextjs", "next js"], ["React"]),
  s("Vue.js", "Frameworks", ["vue", "vuejs", "vue 3"], ["React", "Angular"]),
  s("Angular", "Frameworks", ["angularjs", "angular 2+"], ["React", "Vue.js"]),
  s("Node.js", "Frameworks", ["node", "nodejs", "node js"], ["Express"]),
  s("Express", "Frameworks", ["express.js", "expressjs"], [
    "Node.js",
    "FastAPI",
  ]),
  s("FastAPI", "Frameworks", ["fast api"], ["Flask", "Django", "Express"]),
  s("Django", "Frameworks", ["django rest framework", "drf"], [
    "FastAPI",
    "Flask",
  ]),
  s("Flask", "Frameworks", [], ["FastAPI", "Django"]),
  s("Spring Boot", "Frameworks", ["spring", "springboot"], ["Java"]),
  s(".NET", "Frameworks", ["dotnet", "asp.net", ".net core"], ["C#"]),
  s("Flutter", "Frameworks", [], ["React Native", "Dart"]),
  s("React Native", "Frameworks", ["react-native"], ["React", "Flutter"]),
  s("Tailwind CSS", "Frameworks", ["tailwind", "tailwindcss"], ["HTML/CSS"]),
  s("Ruby on Rails", "Frameworks", ["rails", "ror"], ["Ruby"]),

  // Libraries
  s("PyTorch", "Libraries", ["torch"], ["TensorFlow"]),
  s("TensorFlow", "Libraries", ["tf", "keras"], ["PyTorch"]),
  s("Pandas", "Libraries", [], ["NumPy"]),
  s("NumPy", "Libraries", ["numpy"], ["Pandas"]),
  s("Scikit-Learn", "Libraries", ["sklearn", "scikit learn"], ["Pandas"]),
  s("Redux", "Libraries", ["redux toolkit", "rtk"], ["React"]),
  s("GraphQL", "Libraries", ["apollo", "graph ql"], ["REST APIs"]),
  s("jQuery", "Libraries", [], ["JavaScript"]),
  s("Hugging Face", "Libraries", ["transformers", "huggingface"], [
    "PyTorch",
    "LLMs",
  ]),
  s("LangChain", "Libraries", ["langgraph"], ["LLMs", "RAG"]),
  s("Jest", "Libraries", ["vitest"], ["Unit Testing"]),
  s("Playwright", "Libraries", ["cypress", "selenium"], ["Unit Testing"]),

  // Databases
  s("PostgreSQL", "Databases", ["postgres", "psql", "pgsql"], ["MySQL", "SQL"]),
  s("MySQL", "Databases", ["mariadb"], ["PostgreSQL", "SQL"]),
  s("MongoDB", "Databases", ["mongo", "mongoose"], ["DynamoDB"]),
  s("Redis", "Databases", ["redis cache"], ["Memcached"]),
  s("Elasticsearch", "Databases", ["elastic", "opensearch", "elk"], []),
  s("SQLite", "Databases", [], ["PostgreSQL"]),
  s("DynamoDB", "Databases", ["dynamo"], ["MongoDB"]),
  s("Cassandra", "Databases", ["apache cassandra"], ["DynamoDB"]),
  s("Firebase", "Databases", ["firestore"], ["MongoDB"]),
  s("Snowflake", "Databases", [], ["BigQuery"]),

  // DevOps & Containers
  s(
    "Docker",
    "DevOps & Containers",
    ["containers", "dockerfile", "docker compose"],
    ["Kubernetes"],
  ),
  s(
    "Kubernetes",
    "DevOps & Containers",
    ["k8s", "kubectl", "helm", "eks", "gke"],
    ["Docker"],
  ),
  s(
    "Terraform",
    "DevOps & Containers",
    ["iac", "infrastructure as code", "hcl"],
    ["Ansible"],
  ),
  s(
    "CI/CD",
    "DevOps & Containers",
    [
      "continuous integration",
      "github actions",
      "jenkins",
      "gitlab ci",
      "circleci",
    ],
    ["Docker"],
  ),
  s("Ansible", "DevOps & Containers", [], ["Terraform"]),
  s("Linux", "DevOps & Containers", ["ubuntu", "unix", "debian"], ["Bash"]),
  s("Nginx", "DevOps & Containers", ["reverse proxy"], ["Linux"]),
  s(
    "Prometheus",
    "DevOps & Containers",
    ["grafana", "observability", "monitoring"],
    ["Kubernetes"],
  ),
  s(
    "Microservices",
    "DevOps & Containers",
    ["micro-services", "service mesh"],
    ["System Design"],
  ),

  // AI / ML
  s(
    "Machine Learning",
    "AI / Machine Learning",
    ["ml", "predictive modeling"],
    ["Deep Learning"],
  ),
  s("Deep Learning", "AI / Machine Learning", ["neural networks", "dl"], [
    "Machine Learning",
    "PyTorch",
  ]),
  s(
    "LLMs",
    "AI / Machine Learning",
    ["large language models", "llm", "gpt", "prompt engineering"],
    ["NLP", "RAG"],
  ),
  s(
    "RAG",
    "AI / Machine Learning",
    ["retrieval augmented generation", "vector search", "embeddings"],
    ["LLMs"],
  ),
  s(
    "NLP",
    "AI / Machine Learning",
    ["natural language processing", "text mining"],
    ["LLMs"],
  ),
  s(
    "Computer Vision",
    "AI / Machine Learning",
    ["opencv", "image recognition", "cv"],
    ["Deep Learning"],
  ),
  s(
    "MLOps",
    "AI / Machine Learning",
    ["mlflow", "kubeflow", "model deployment"],
    ["Docker"],
  ),
  s("Reinforcement Learning", "AI / Machine Learning", ["rl"], [
    "Deep Learning",
  ]),
  s(
    "Statistics",
    "AI / Machine Learning",
    ["statistical analysis", "a/b testing", "hypothesis testing"],
    ["Data Analysis"],
  ),

  // Data & Analytics
  s("Apache Spark", "Data & Analytics", ["spark", "pyspark"], ["Apache Kafka"]),
  s("Apache Kafka", "Data & Analytics", ["kafka", "event streaming"], [
    "Apache Spark",
    "RabbitMQ",
  ]),
  s("ETL", "Data & Analytics", ["data pipelines", "elt", "airflow", "dbt"], [
    "Apache Spark",
  ]),
  s("Tableau", "Data & Analytics", ["power bi", "looker"], ["Data Analysis"]),
  s(
    "Data Analysis",
    "Data & Analytics",
    ["data analytics", "excel", "business intelligence"],
    ["Statistics"],
  ),
  s("BigQuery", "Data & Analytics", ["google bigquery"], ["Snowflake"]),
  s("RabbitMQ", "Data & Analytics", ["message queue", "amqp", "sqs"], [
    "Apache Kafka",
  ]),

  // Domain / SE
  s(
    "System Design",
    "Domain / SE Skills",
    ["distributed systems", "scalability", "high availability"],
    ["Microservices"],
  ),
  s(
    "REST APIs",
    "Domain / SE Skills",
    ["rest", "restful", "api design", "openapi"],
    ["GraphQL"],
  ),
  s(
    "Unit Testing",
    "Domain / SE Skills",
    ["tdd", "test driven development", "pytest", "junit"],
    ["Jest"],
  ),
  s("Data Structures", "Domain / SE Skills", ["algorithms", "dsa"], []),
  s(
    "OOP",
    "Domain / SE Skills",
    ["object oriented programming", "design patterns", "solid principles"],
    [],
  ),
  s("Agile", "Domain / SE Skills", ["scrum", "kanban", "sprint planning"], [
    "Leadership",
  ]),
  s(
    "Performance Optimization",
    "Domain / SE Skills",
    ["caching", "profiling", "latency optimization"],
    ["System Design"],
  ),

  // Soft skills
  s("Leadership", "Soft Skills", ["team lead", "mentoring", "mentored"], [
    "Communication",
  ]),
  s(
    "Communication",
    "Soft Skills",
    ["stakeholder management", "presentation skills"],
    ["Leadership"],
  ),
  s(
    "Problem Solving",
    "Soft Skills",
    ["critical thinking", "analytical skills"],
    [],
  ),
  s("Collaboration", "Soft Skills", ["teamwork", "cross-functional"], [
    "Communication",
  ]),
  s("Project Management", "Soft Skills", ["roadmapping", "pmp"], ["Agile"]),
  s("Ownership", "Soft Skills", ["self-starter", "accountability"], []),

  // Developer tools
  s("Git", "Developer Tools", ["version control", "gitflow"], ["GitHub"]),
  s("GitHub", "Developer Tools", ["gitlab", "bitbucket"], ["Git"]),
  s("Postman", "Developer Tools", ["insomnia"], ["REST APIs"]),
  s("Jira", "Developer Tools", ["confluence", "linear"], ["Agile"]),
  s("Figma", "Developer Tools", ["sketch", "adobe xd"], []),

  // Cybersecurity
  s("OWASP", "Cybersecurity", ["owasp top 10", "web security", "xss", "csrf"], [
    "Penetration Testing",
  ]),
  s(
    "Penetration Testing",
    "Cybersecurity",
    ["pentesting", "pen testing", "ethical hacking"],
    ["OWASP"],
  ),
  s("Cryptography", "Cybersecurity", ["encryption", "tls", "pki"], []),
  s(
    "OAuth",
    "Cybersecurity",
    ["oauth2", "oauth 2.0", "jwt", "sso", "openid connect"],
    ["OWASP"],
  ),

  // Cloud
  s(
    "AWS",
    "Cloud Platforms",
    ["amazon web services", "ec2", "s3", "lambda", "cloudformation"],
    ["Microsoft Azure", "Google Cloud"],
  ),
  s("Microsoft Azure", "Cloud Platforms", ["azure"], ["AWS", "Google Cloud"]),
  s(
    "Google Cloud",
    "Cloud Platforms",
    ["gcp", "google cloud platform", "cloud run"],
    ["AWS", "Microsoft Azure"],
  ),
]

export function aliasCount(tax: Skill[]) {
  return tax.reduce((n, sk) => n + sk.aliases.length, 0)
}
