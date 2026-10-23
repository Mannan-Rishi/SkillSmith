from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import time
import uuid

class TestAssertion(BaseModel):
    assertion_type: str = Field(description="e.g. contains, equals, regex, not_empty, numeric_range")
    expected: Any = Field(description="Expected value or pattern")
    target_field: Optional[str] = Field(default=None, description="Field in output to check, or entire output if None")

class TestCase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    description: str
    input_data: Dict[str, Any]
    expected_behavior: str
    assertions: List[TestAssertion] = Field(default_factory=list)
    is_edge_case: bool = False

class TestResult(BaseModel):
    test_id: str
    test_name: str
    passed: bool
    actual_output: Any = None
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0
    assertion_results: List[Dict[str, Any]] = Field(default_factory=list)

class ExecutionRun(BaseModel):
    run_id: str = Field(default_factory=lambda: f"run_{str(uuid.uuid4())[:8]}")
    skill_id: str
    version: str
    timestamp: float = Field(default_factory=time.time)
    status: str = "completed"  # completed, failed, error
    passed_count: int = 0
    failed_count: int = 0
    total_tests: int = 0
    pass_rate: float = 0.0
    test_results: List[TestResult] = Field(default_factory=list)
    logs: List[str] = Field(default_factory=list)

class ImprovementRecord(BaseModel):
    iteration: int
    previous_version: str
    new_version: str
    failure_analysis: str
    changes_made: str
    before_pass_rate: float
    after_pass_rate: float
    improved: bool
    regression_detected: bool
    decision: str = "accepted"  # "accepted" | "rejected"
    decision_reason: str = ""
    fixed_tests: List[str] = Field(default_factory=list)
    regressed_tests: List[str] = Field(default_factory=list)
    remaining_issues: List[str] = Field(default_factory=list)
    timestamp: float = Field(default_factory=time.time)

class CustomExecutionRequest(BaseModel):
    inputs: Dict[str, Any] = Field(default_factory=dict)
    expected_output: Optional[Any] = None
    version: Optional[str] = None

class CustomExecutionResponse(BaseModel):
    success: bool
    output: Any = None
    error: Optional[str] = None
    logs: str = ""
    execution_time_ms: float = 0.0
    version: str
    matches_expected: Optional[bool] = None
    comparison_details: Optional[str] = None

class SaveTestCaseRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    input_data: Dict[str, Any]
    expected_output: Optional[Any] = None
    expected_behavior: Optional[str] = ""
    is_edge_case: bool = False
    assertion_type: Optional[str] = "equals"
    target_field: Optional[str] = None

class AppSettings(BaseModel):
    auto_evolve_on_failure: bool = False
    max_evolution_iterations: int = 2

class SkillManifest(BaseModel):
    name: str
    slug: str
    description: str
    category: str
    version: str = "1.0.0"
    parent_version: Optional[str] = None
    author: str = "SkillSmith AI (Gemma)"
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    execution_strategy: str = "restricted_python"  # text_processor, csv_analyzer, restricted_python
    safety_requirements: List[str] = Field(default_factory=list)
    code: Optional[str] = Field(default=None, description="Executable code adapter if applicable")

class SkillVersion(BaseModel):
    version: str
    parent_version: Optional[str] = None
    manifest: SkillManifest
    skill_md: str
    code: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    latest_run: Optional[ExecutionRun] = None

class Skill(BaseModel):
    id: str = Field(default_factory=lambda: f"skill_{str(uuid.uuid4())[:8]}")
    name: str
    category: str
    current_version: str = "1.0.0"
    versions: Dict[str, SkillVersion] = Field(default_factory=dict)
    test_cases: List[TestCase] = Field(default_factory=list)
    runs: List[ExecutionRun] = Field(default_factory=list)
    improvements: List[ImprovementRecord] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)

class SkillCreateRequest(BaseModel):
    user_requirement: str
    category: Optional[str] = None
    inputs_description: Optional[str] = None
    expected_outputs: Optional[str] = None
    constraints: Optional[str] = None

class SkillImproveRequest(BaseModel):
    max_iterations: int = 1
